/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        02_Auth.gs — Authentication · SHA-256+Salt · Token session · RBAC · Audit
 *  Version:     0.0.1
 *  Last Update: 2026-05-30
 *  Developer:   ครูที
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 ชั่วโมง

/* ── Password hashing (SHA-256 + per-user salt) ──────────────────── */
function Auth_salt_() {
  return Utilities.getUuid().replace(/-/g, '');
}
function Auth_hash_(password, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(password) + ':' + String(salt), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

/* ── Token (32-byte web-safe) ────────────────────────────────────── */
function Auth_token_() {
  var raw = Utilities.getUuid() + Utilities.getUuid();
  return Utilities.base64EncodeWebSafe(raw).replace(/=/g, '').substring(0, 48);
}

/* ── Public user shape (ไม่ส่ง hash/salt ออก client) ─────────────── */
function Auth_publicUser_(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, role: u.role, full_name: u.full_name,
    photo_url: u.photo_url, email: u.email, phone: u.phone, title: u.title,
    class_id: u.class_id,
    must_change_pw: String(u.must_change_pw) === 'true' || u.must_change_pw === true,
    role_label: ROLE_LABEL[u.role] || u.role
  };
}

/* ── Login ───────────────────────────────────────────────────────── */
function Auth_login(username, password, userAgent) {
  username = String(username || '').trim().toLowerCase();
  if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  var users = DB_readAll(SHEETS.USERS);
  var u = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).toLowerCase() === username) { u = users[i]; break; }
  }
  if (!u) throw new Error('ไม่พบบัญชีผู้ใช้นี้ในระบบ');
  if (u.status !== 'active') throw new Error('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  if (Auth_hash_(password, u.salt) !== u.password_hash) throw new Error('รหัสผ่านไม่ถูกต้อง');

  var token = Auth_token_();
  var now = new Date();
  DB_insert(SHEETS.SESSIONS, {
    token: token, user_id: u.id, username: u.username, role: u.role,
    user_agent: String(userAgent || '').substring(0, 200),
    created_at: cfg_iso_(now),
    expires_at: cfg_iso_(new Date(now.getTime() + SESSION_TTL_MS))
  });
  DB_update(SHEETS.USERS, u.id, { last_login: cfg_now_() });
  Audit_log(u, 'login', 'session', token.substring(0, 8), 'เข้าสู่ระบบ');

  return { token: token, user: Auth_publicUser_(u), caps: CAPS[u.role] || [] };
}

/* ── Verify token → user (ใช้ทุก authenticated request) ──────────── */
function Auth_verify_(token) {
  if (!token) throw new Error('AUTH_REQUIRED');
  var sessions = DB_readAll(SHEETS.SESSIONS);
  var s = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].token === token) { s = sessions[i]; break; }
  }
  if (!s) throw new Error('SESSION_INVALID');
  if (new Date(s.expires_at).getTime() < Date.now()) {
    DB_delete(SHEETS.SESSIONS, token);
    throw new Error('SESSION_EXPIRED');
  }
  var u = DB_get(SHEETS.USERS, s.user_id);
  if (!u || u.status !== 'active') throw new Error('SESSION_INVALID');
  return u;
}

function Auth_logout(token) {
  if (token) {
    var u = null;
    try { u = Auth_verify_(token); } catch (e) {}
    DB_delete(SHEETS.SESSIONS, token);
    if (u) Audit_log(u, 'logout', 'session', token.substring(0, 8), 'ออกจากระบบ');
  }
  return true;
}

/* ── RBAC ────────────────────────────────────────────────────────── */
function Auth_can_(user, cap) {
  if (!user) return false;
  var caps = CAPS[user.role] || [];
  return caps.indexOf('*') >= 0 || caps.indexOf(cap) >= 0;
}
function Auth_require_(user, cap) {
  if (!Auth_can_(user, cap)) throw new Error('PERMISSION_DENIED:' + cap);
  return true;
}

// ให้ครูเข้าถึงได้ทุกห้อง (รวมครูประจำวิชาและประจำชั้น)
function Auth_classScope_(user) {
  if (user.role === 'admin' || user.role === 'teacher') return null; // null = เห็นทุกห้อง
  return null;
}

/* ── Change password / profile ──────────────────────────────────── */
function Auth_changePassword(user, oldPw, newPw) {
  var u = DB_get(SHEETS.USERS, user.id);
  if (Auth_hash_(oldPw, u.salt) !== u.password_hash) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  if (String(newPw || '').length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
  var salt = Auth_salt_();
  DB_update(SHEETS.USERS, u.id, {
    salt: salt, password_hash: Auth_hash_(newPw, salt), must_change_pw: false
  });
  Audit_log(user, 'change_password', 'user', u.id, 'เปลี่ยนรหัสผ่าน');
  return true;
}

function Auth_resetPassword(admin, userId, newPw) {
  Auth_require_(admin, '*');
  var salt = Auth_salt_();
  DB_update(SHEETS.USERS, userId, {
    salt: salt, password_hash: Auth_hash_(newPw || '123456', salt), must_change_pw: true
  });
  Audit_log(admin, 'reset_password', 'user', userId, 'รีเซ็ตรหัสผ่าน');
  return true;
}

/* ── Audit log ───────────────────────────────────────────────────── */
function Audit_log(user, action, entity, entityId, detail) {
  try {
    DB_insert(SHEETS.AUDIT, {
      user_id: user ? user.id : '',
      username: user ? user.username : 'system',
      role: user ? user.role : '',
      action: action, entity: entity || '', entity_id: entityId || '',
      detail: detail || '', user_agent: '', created_at: cfg_now_()
    });
  } catch (e) {}
}
