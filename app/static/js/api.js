const API = {
  token: () => localStorage.getItem('token'),

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.token();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  },

  get:    (path)       => API.request('GET',    path),
  post:   (path, body) => API.request('POST',   path, body),
  patch:  (path, body) => API.request('PATCH',  path, body),
  del:    (path)       => API.request('DELETE', path),
};

function requireAuth() {
  if (!localStorage.getItem('token')) window.location.href = '/login';
}

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

function loadSidebarUser() {
  const user = getUser();
  if (!user) return;
  const el = n => document.getElementById(n);
  if (el('sidebar-user-name')) el('sidebar-user-name').textContent = user.name;
  if (el('sidebar-user-plan')) el('sidebar-user-plan').textContent = user.plan + ' plan';
  if (el('sidebar-avatar'))    el('sidebar-avatar').textContent = user.name[0].toUpperCase();
}

/* ── Formatting helpers ── */
function rupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = { paid: 'green', sent: 'blue', draft: 'gray', cancelled: 'red', overdue: 'orange', pending: 'yellow', submitted: 'blue', confirmed: 'green', rejected: 'red' };
  return `<span class="badge badge-${map[status] || 'gray'}">${status}</span>`;
}

/* ── Toast ── */
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* ── Alert ── */
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'alert';
}

/* ── Copy to clipboard ── */
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => toast(label));
}
