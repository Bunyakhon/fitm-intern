import { apiRequest } from '../api/client.js';
import { getRoleToken, clearRoleSession, roleClaims } from '../auth/roleAuthStorage.js';
import { adminRequest } from '../api/superAdmin.api.js';
import { showToast } from '../ui/feedback.js';
export function mountTeacherAdminNavigation({ document, target = window, request = apiRequest, admin = adminRequest, getToken = () => getRoleToken('teacher'), clear = () => clearRoleSession('teacher'), toast = showToast } = {}) {
  if (document.body.dataset.workflowRole !== 'teacher') return;
  const nav = document.querySelector('.sidebar-menu'); if (!nav) return;
  const link = document.createElement('a'); link.className = 'sidebar-item'; link.href = '/src/super_admin/super_admin.html'; link.textContent = 'เข้าสู่ระบบผู้ดูแล'; link.hidden = true; nav.append(link);
  let token, available = false, generation = 0, loggingOut = false;
  async function load() {
    token = getToken(); available = false; link.hidden = true; const ticket = ++generation;
    if (!token) return;
    try { const result = await request('/api/teachers/admin-access', { auth: false, headers: { Authorization: `Bearer ${token}` } }); if (ticket !== generation || token !== getToken()) return; available = result.available === true; link.hidden = !available; }
    catch { /* A failed capability check never reveals the privileged entry. */ }
  }
  document.getElementById('teacherLogout')?.addEventListener('click', async event => {
    // Evidence only selects a server revocation attempt; it never authorizes it.
    if (!available && !roleClaims(getToken(), 'teacher')?.admin_grant_id) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (loggingOut) return; loggingOut = true;
    try { await admin('/logout', { method: 'POST', body: {} }); clear(); target.location.replace('/login.html'); }
    catch (error) { if ([401, 403].includes(error.status)) { clear(); target.location.replace('/login.html'); } else toast('ยังเพิกถอน Session ไม่สำเร็จ กรุณาลองใหม่', 'error'); }
    finally { loggingOut = false; }
  }, true);
  target.addEventListener('storage', () => { if (token !== getToken()) { ++generation; available = false; link.hidden = true; } });
  target.addEventListener('pagehide', () => { ++generation; available = false; link.hidden = true; });
  target.addEventListener('pageshow', event => { if (event.persisted) load(); });
  target.addEventListener('focus', load);
  const ready = load(); return { ready, load };
}
if (typeof document !== 'undefined') mountTeacherAdminNavigation({ document });
