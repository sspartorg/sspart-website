// Owner desk. Everything a visitor typed reaches the page through textContent, never innerHTML:
// this page runs with the owner's session, so visitor text must never be able to run as code.
const $ = id => document.getElementById(id);
const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const LIST_LIMIT = 200;
const when = iso => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const label = s => s[0].toUpperCase() + s.slice(1);

// Builds an element from a tag, optional props, and children (text stays text)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(k => k != null));
  return n;
};
const say = (node, msg) => { node.textContent = msg; node.hidden = !msg; };

const { url, key } = window.SSPART_SUPABASE;
let db, current = null, searchTimer;

const showLogin = () => { $('login').hidden = false; $('board').hidden = true; $('sign-out').hidden = true; };

const showBoard = async () => {
  const { data: ok, error } = await db.rpc('is_admin');
  if (error || !ok) {
    await db.auth.signOut();
    showLogin();
    return say($('login-status'), error ? 'Could not check this account. Try again.' : 'This account has no access to enquiries.');
  }
  $('login').hidden = true; $('board').hidden = false; $('sign-out').hidden = false;
  await loadList();
};

const loadList = async () => {
  say($('list-status'), '');
  const typed = $('search').value.replace(/\D/g, '');
  let q = db.from('enquiries').select('id, created_at, name, mobile, product, status').order('created_at', { ascending: false }).limit(LIST_LIMIT);
  if (typed) q = q.ilike('mobile_digits', `%${typed}%`);
  if ($('filter').value) q = q.eq('status', $('filter').value);
  const { data, error } = await q;
  if (error) return say($('list-status'), 'Could not load enquiries. Refresh to try again.');
  const empty = typed || $('filter').value ? 'No enquiries match this search.' : 'No enquiries yet. New ones from the contact page appear here.';
  $('rows').replaceChildren(...(data.length ? data.map(row) : [el('li', { className: 'desk-empty', textContent: empty })]));
  if (data.length === LIST_LIMIT) say($('list-status'), `Showing the newest ${LIST_LIMIT}. Search by mobile to find older ones.`);
};

const row = e => {
  const open = el('button', { type: 'button', className: e.id === current ? 'on' : '', onclick: () => openEnquiry(e.id) },
    el('b', { textContent: e.name }), el('span', { className: `pill ${e.status}`, textContent: label(e.status) }),
    el('span', { textContent: e.mobile }), el('small', { textContent: `${e.product}, ${when(e.created_at)}` }));
  return el('li', {}, open);
};

const openEnquiry = async id => {
  current = id;
  const [{ data: e, error }, { data: comments, error: commentError }] = await Promise.all([
    db.from('enquiries').select('*').eq('id', id).single(),
    db.from('enquiry_comments').select('*').eq('enquiry_id', id).order('created_at'),
  ]);
  // Someone may have opened another enquiry while this one loaded
  if (current !== id) return;
  if (error || commentError) return $('detail').replaceChildren(el('p', { textContent: 'Could not open this enquiry. Refresh to try again.' }));

  const status = el('select', { onchange: async () => {
    const { error } = await db.from('enquiries').update({ status: status.value }).eq('id', id);
    if (error) return say(note, 'Could not change the status. Try again.');
    await loadList();
  } }, ...STATUSES.map(s => el('option', { value: s, textContent: label(s), selected: s === e.status })));

  const contact = el('dl', {},
    el('div', {}, el('dt', { textContent: 'Mobile' }), el('dd', {}, el('a', { href: `tel:${e.mobile.replace(/[^+\d]/g, '')}`, textContent: e.mobile }))),
    e.email ? el('div', {}, el('dt', { textContent: 'Email' }), el('dd', {}, el('a', { href: `mailto:${encodeURIComponent(e.email)}`, textContent: e.email }))) : null,
    e.company ? el('div', {}, el('dt', { textContent: 'Company' }), el('dd', { textContent: e.company })) : null,
    el('div', {}, el('dt', { textContent: 'Interested in' }), el('dd', { textContent: e.product })),
    el('div', {}, el('dt', { textContent: 'Received' }), el('dd', { textContent: when(e.created_at) })));

  const note = el('p', { className: 'form-status', hidden: true, role: 'alert' });
  const thread = el('ol', { className: 'thread', ariaLabel: 'Comments' }, ...comments.map(c =>
    el('li', {}, el('p', { textContent: c.body }), el('small', { textContent: `${c.author_email}, ${when(c.created_at)}` }))));
  if (!comments.length) thread.append(el('li', { className: 'desk-empty', textContent: 'No comments yet. Log each call or follow-up here.' }));

  const text = el('textarea', { required: true, maxLength: 4000, rows: 3, ariaLabel: 'New comment' });
  const addComment = el('form', { onsubmit: async ev => {
    ev.preventDefault();
    if (!text.value.trim()) return;
    const { error } = await db.from('enquiry_comments').insert({ enquiry_id: id, body: text.value.trim() });
    if (error) return say(note, 'Could not save the comment. Your text is still in the box.');
    await openEnquiry(id);
  } }, text, el('button', { type: 'submit', className: 'btn btn-solid', textContent: 'Add comment' }));

  const remove = el('button', { type: 'button', className: 'btn danger', textContent: 'Delete enquiry', onclick: async () => {
    if (!confirm(`Delete the enquiry from ${e.name} and its comments? This can't be undone.`)) return;
    const { error } = await db.from('enquiries').delete().eq('id', id);
    if (error) return say(note, 'Could not delete this enquiry. Try again.');
    current = null;
    $('detail').replaceChildren();
    await loadList();
  } });

  $('detail').replaceChildren(
    el('header', {}, el('h2', { textContent: e.name }), el('label', {}, 'Status', status)),
    contact, el('p', { className: 'desk-message', textContent: e.message }),
    el('h3', { textContent: 'Comments' }), thread, addComment, note, remove);
  await loadList();
};

if (!url || !key) {
  $('login').hidden = false;
  say($('login-status'), 'This desk is not connected yet. Add the Supabase URL and key to js/config.js.');
  $('login-form').querySelector('button').disabled = true;
} else {
  db = supabase.createClient(url, key);
  $('login-form').onsubmit = async e => {
    e.preventDefault();
    say($('login-status'), '');
    const f = e.target;
    const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (error) return say($('login-status'), error.status === 400 ? 'That email or password is wrong. Check them and try again.' : 'Could not reach the sign-in service. Check your connection and try again.');
    f.reset();
    await showBoard();
  };
  $('sign-out').onclick = async () => { await db.auth.signOut(); current = null; $('detail').replaceChildren(); showLogin(); };
  $('search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadList, 250); };
  $('filter').onchange = loadList;
  db.auth.getSession().then(({ data }) => data.session ? showBoard() : showLogin());
}
