// Owner desk. Everything a visitor typed reaches the page through textContent, never innerHTML:
// this page runs with the owner's session, so visitor text must never be able to run as code.
const $ = id => document.getElementById(id);
const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const LIST_LIMIT = 200;
const when = iso => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const label = s => s[0].toUpperCase() + s.slice(1);
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
const ago = iso => {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return rtf.format(-mins, 'minute');
  if (mins < 1440) return rtf.format(-Math.round(mins / 60), 'hour');
  if (mins < 10080) return rtf.format(-Math.round(mins / 1440), 'day');
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(w => [...w][0]).join('').toUpperCase();
// wa.me needs the country code; a bare 10-digit number is Indian
const whatsapp = mobile => { const d = mobile.replace(/\D/g, ''); return `https://wa.me/${d.length === 10 ? '91' + d : d}`; };

// Builds an element from a tag, optional props, and children (text stays text)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(k => k != null));
  return n;
};
const say = (node, msg) => { node.textContent = msg; node.hidden = !msg; };
const avatar = name => el('span', { className: 'avatar', ariaHidden: 'true', textContent: initials(name) });
const pick = () => el('p', { className: 'desk-pick', textContent: 'Pick an enquiry to see the details.' });

const { url, key } = window.SSPART_SUPABASE;
let db, current = null, searchTimer;
const filter = () => $('filter').querySelector('[aria-pressed=true]').dataset.status;

const showLogin = () => { $('login').hidden = false; $('board').hidden = true; $('sign-out').hidden = true; $('who').textContent = ''; };

const showBoard = async () => {
  const { data: ok, error } = await db.rpc('is_admin');
  if (error || !ok) {
    await db.auth.signOut();
    showLogin();
    return say($('login-status'), error ? 'Could not check this account. Try again.' : 'This account has no access to enquiries.');
  }
  const { data } = await db.auth.getSession();
  $('who').textContent = data.session?.user?.email || '';
  $('login').hidden = true; $('board').hidden = false; $('sign-out').hidden = false;
  await loadList();
};

// ponytail: counts read every status row; a grouped count view if enquiries reach the thousands
const loadCounts = async () => {
  const { data } = await db.from('enquiries').select('status');
  if (!data) return;
  const n = s => data.filter(e => !s || e.status === s).length;
  $('filter').querySelectorAll('button').forEach(b => { b.lastElementChild.textContent = n(b.dataset.status); });
};

const loadList = async () => {
  say($('list-status'), '');
  const typed = $('search').value.replace(/\D/g, '');
  let q = db.from('enquiries').select('id, created_at, name, mobile, product, status').order('created_at', { ascending: false }).limit(LIST_LIMIT);
  if (typed) q = q.ilike('mobile_digits', `%${typed}%`);
  if (filter()) q = q.eq('status', filter());
  const [{ data, error }] = await Promise.all([q, loadCounts()]);
  if (error) return say($('list-status'), 'Could not load enquiries. Refresh to try again.');
  const empty = typed || filter() ? 'No enquiries match this search.' : 'No enquiries yet. New ones from the contact page appear here.';
  $('rows').replaceChildren(...(data.length ? data.map(row) : [el('li', { className: 'desk-empty', textContent: empty })]));
  if (data.length === LIST_LIMIT) say($('list-status'), `Showing the newest ${LIST_LIMIT}. Search by mobile to find older ones.`);
};

const row = e => {
  const open = el('button', { type: 'button', className: `${e.status}${e.id === current ? ' on' : ''}`, onclick: () => openEnquiry(e.id) },
    avatar(e.name), el('b', { textContent: e.name }), el('time', { dateTime: e.created_at, title: when(e.created_at), textContent: ago(e.created_at) }),
    el('small', { textContent: `${e.product}  •  ${e.mobile}` }), el('span', { className: `pill ${e.status}`, textContent: label(e.status) }));
  return el('li', {}, open);
};

const close = () => { current = null; $('board').classList.remove('reading'); $('detail').replaceChildren(pick()); $('rows').querySelector('.on')?.classList.remove('on'); };

const openEnquiry = async id => {
  current = id;
  const [{ data: e, error }, { data: comments, error: commentError }] = await Promise.all([
    db.from('enquiries').select('*').eq('id', id).single(),
    db.from('enquiry_comments').select('*').eq('enquiry_id', id).order('created_at'),
  ]);
  // Someone may have opened another enquiry while this one loaded
  if (current !== id) return;
  $('board').classList.add('reading');
  if (error || commentError) return $('detail').replaceChildren(el('p', { textContent: 'Could not open this enquiry. Refresh to try again.' }));

  const note = el('p', { className: 'form-status', hidden: true, role: 'alert' });
  const status = el('div', { className: 'desk-status', role: 'group', ariaLabel: 'Status' }, ...STATUSES.map(s => el('button', {
    type: 'button', className: s, textContent: label(s), ariaPressed: String(s === e.status), onclick: async () => {
      const { error } = await db.from('enquiries').update({ status: s }).eq('id', id);
      if (error) return say(note, 'Could not change the status. Try again.');
      status.querySelectorAll('button').forEach(b => { b.ariaPressed = String(b.className === s); });
      await loadList();
    } })));

  const tel = `tel:${e.mobile.replace(/[^+\d]/g, '')}`;
  const actions = el('div', { className: 'desk-actions' },
    el('a', { className: 'btn btn-solid', href: tel, textContent: 'Call' }),
    el('a', { className: 'btn', href: whatsapp(e.mobile), target: '_blank', rel: 'noopener', textContent: 'WhatsApp' }),
    e.email ? el('a', { className: 'btn', href: `mailto:${encodeURIComponent(e.email)}`, textContent: 'Email' }) : null);

  const fact = (dt, dd) => el('div', {}, el('dt', { textContent: dt }), el('dd', {}, dd));
  const facts = el('dl', { className: 'desk-facts' },
    fact('Mobile', el('a', { href: tel, textContent: e.mobile })),
    e.email ? fact('Email', el('a', { href: `mailto:${encodeURIComponent(e.email)}`, textContent: e.email })) : null,
    e.company ? fact('Company', e.company) : null,
    fact('Interested in', e.product),
    fact('Received', when(e.created_at)));

  const thread = el('ol', { className: 'thread', ariaLabel: 'Notes' }, ...comments.map(c =>
    el('li', {}, el('p', { textContent: c.body }), el('small', { textContent: `${c.author_email}  •  ${when(c.created_at)}` }))));
  if (!comments.length) thread.append(el('li', { className: 'desk-empty', textContent: 'No notes yet. Log each call or follow-up here.' }));

  const text = el('textarea', { required: true, maxLength: 4000, rows: 2, ariaLabel: 'New note', placeholder: 'Add a note, e.g. Called, sending the quote tomorrow' });
  const addComment = el('form', { onsubmit: async ev => {
    ev.preventDefault();
    if (!text.value.trim()) return;
    const { error } = await db.from('enquiry_comments').insert({ enquiry_id: id, body: text.value.trim() });
    if (error) return say(note, 'Could not save the note. Your text is still in the box.');
    await openEnquiry(id);
  } }, text, el('button', { type: 'submit', className: 'btn btn-solid', textContent: 'Add note' }));

  const remove = el('button', { type: 'button', className: 'btn danger', textContent: 'Delete enquiry', onclick: async () => {
    if (!confirm(`Delete the enquiry from ${e.name} and its notes? This can't be undone.`)) return;
    const { error } = await db.from('enquiries').delete().eq('id', id);
    if (error) return say(note, 'Could not delete this enquiry. Try again.');
    close();
    await loadList();
  } });

  const sub = [e.company, e.product].filter(Boolean).join('  •  ');
  $('detail').replaceChildren(
    el('button', { type: 'button', className: 'desk-back', textContent: '← All enquiries', onclick: close }),
    el('header', {}, avatar(e.name), el('div', {}, el('h2', { textContent: e.name }), el('p', { textContent: `${sub}  •  ${ago(e.created_at)}` }))),
    actions, status, note,
    el('section', {}, el('h3', { textContent: 'Message' }), el('p', { className: 'desk-message', textContent: e.message })),
    el('section', {}, el('h3', { textContent: 'Details' }), facts),
    el('section', {}, el('h3', { textContent: 'Notes' }), thread, addComment),
    remove);
  $('detail').scrollTop = 0;
  if (matchMedia('(max-width: 900px)').matches) scrollTo(0, 0);
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
  $('sign-out').onclick = async () => { await db.auth.signOut(); close(); showLogin(); };
  $('search').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadList, 250); };
  $('filter').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    $('filter').querySelectorAll('button').forEach(x => { x.ariaPressed = String(x === b); });
    loadList();
  };
  db.auth.getSession().then(({ data }) => data.session ? showBoard() : showLogin());
}
