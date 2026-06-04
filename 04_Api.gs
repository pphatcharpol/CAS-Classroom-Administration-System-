/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        04_Api.gs — Universal API endpoint · single-shot boot · dispatch map
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  Client เรียกผ่าน google.script.run.api(action, payloadJson, token)
 *  ทุก action ตรวจ token + RBAC ภายใน service function เอง
 */

// action ที่ไม่ต้อง login
var PUBLIC_ACTIONS = { 'app.boot_all': 1, 'auth.login': 1, 'ping': 1 };

/**
 * Universal endpoint — รับ action + payload(JSON string) + token
 * คืน JSON string เสมอ: { ok:true, data } | { ok:false, error, code }
 */
function api(action, payloadJson, token) {
  var t0 = Date.now();
  _resetReq_(); // โหลด version counters สดต่อ request (กัน L1 stale ข้ามผู้ใช้)
  try {
    var p = {};
    if (payloadJson) { try { p = JSON.parse(payloadJson); } catch (e) { p = {}; } }

    var user = null;
    if (!PUBLIC_ACTIONS[action]) {
      user = Auth_verify_(token); // throw ถ้า token ไม่ผ่าน
    }

    var data = API_dispatch_(action, user, p, token);
    return JSON.stringify({ ok: true, data: data, ms: Date.now() - t0 });
  } catch (err) {
    var msg = String(err && err.message ? err.message : err);
    var code = 'ERROR';
    if (/^AUTH_REQUIRED|SESSION_/.test(msg)) code = 'AUTH';
    else if (/^PERMISSION_DENIED/.test(msg)) { code = 'FORBIDDEN'; msg = 'คุณไม่มีสิทธิ์ดำเนินการนี้'; }
    return JSON.stringify({ ok: false, error: msg, code: code });
  }
}

function API_dispatch_(action, user, p, token) {
  switch (action) {
    /* ── Public / Auth ── */
    case 'ping':            return { pong: true, version: APP.VERSION };
    case 'app.boot_all':    return App_bootAll(token, p);
    case 'auth.login':      return Auth_login(p.username, p.password, p.user_agent);
    case 'auth.logout':     return Auth_logout(token);
    case 'auth.me':         return { user: Auth_publicUser_(user), caps: CAPS[user.role] || [] };
    case 'auth.change_pw':  return Auth_changePassword(user, p.old_pw, p.new_pw);
    case 'auth.reset_pw':   return Auth_resetPassword(user, p.user_id, p.new_pw);

    /* ── Dashboard / Reports ── */
    case 'dash.summary':    return Dash_summary(user, p);
    case 'report.overview': return Report_overview(user, p);
    case 'audit.list':      return Audit_list(user, p);

    /* ── Classes ── */
    case 'class.list':      return Class_list(user, p);
    case 'class.save':      return Class_save(user, p);
    case 'class.delete':    return Class_delete(user, p);

    /* ── Students ── */
    case 'student.list':    return Student_list(user, p);
    case 'student.get':     return Student_get(user, p);
    case 'student.save':    return Student_save(user, p);
    case 'student.delete':  return Student_delete(user, p);
    case 'student.move':    return Student_moveClass(user, p);
    case 'student.bulk_import': return Student_bulkImport(user, p);

    /* ── Users / Profile ── */
    case 'user.list':       return User_list(user, p);
    case 'user.save':       return User_save(user, p);
    case 'user.delete':     return User_delete(user, p);
    case 'profile.update':  return Profile_update(user, p);

    /* ── Attendance ── */
    case 'att.sheet':       return Att_sheet(user, p);
    case 'att.save':        return Att_save(user, p);
    case 'att.summary':     return Att_summary(user, p);
    case 'att.history':     return Att_history(user, p);


    /* ── Home visits (กสศ.01) ── */
    case 'visit.meta':      return Visit_meta();
    case 'visit.list':      return Visit_list(user, p);
    case 'visit.get':       return Visit_get(user, p);
    case 'visit.save':      return Visit_save(user, p);
    case 'visit.delete':    return Visit_delete(user, p);
    case 'visit.overview':  return Visit_overview(user, p);

    /* ── บริหารห้องเรียน (เวร/กรรมการ/ผังที่นั่ง/ตารางเรียน) ── */
    case 'classroom.meta':   return Classroom_meta();

    case 'timetable.get':    return Timetable_get(user, p);
    case 'timetable.save':   return Timetable_save(user, p);
    case 'classroom.mine':   return Classroom_mine(user);

    /* ── เงินกิจกรรม · กิจกรรมพัฒนาผู้เรียน · ปฏิทิน (ชุด D) ── */
    case 'extra.meta':       return Extra_meta();
    case 'act.list':         return Act_list(user, p);
    case 'act.save':         return Act_save(user, p);
    case 'act.delete':       return Act_delete(user, p);
    case 'act.summary':      return Act_studentSummary(user, p);
    case 'act.overview':     return Act_overview(user, p);
    case 'event.list':       return Event_list(user, p);
    case 'event.upcoming':   return Event_upcoming(user, p);
    case 'event.save':       return Event_save(user, p);
    case 'event.delete':     return Event_delete(user, p);

    /* ── Announcements ── */
    case 'announce.list':   return Announce_list(user, p);
    case 'announce.save':   return Announce_save(user, p);
    case 'announce.view':   return Announce_view(user, p);
    case 'announce.delete': return Announce_delete(user, p);

    default: throw new Error('ไม่รู้จักคำสั่ง: ' + action);
  }
}

/* ════════ Single-shot boot — public bundle (cached) + user (fresh) ══ */
function App_bootAll(token, p) {
  var ver = _ver_('public');
  var publicBundle = _cacheGet_('app:public:v' + ver);
  if (!publicBundle) {
    var s = Settings_public_();
    publicBundle = {
      app: { name: APP.NAME, short: APP.SHORT, title: APP.TITLE, version: APP.VERSION,
             last_updated: APP.LAST_UPDATED, org: s.school_name, logo_icon: APP.LOGO_ICON,
             description: APP.DESCRIPTION },
      dev: APP.DEV,
      settings: s,
      roles: ROLE_LABEL, role_icons: ROLE_ICON,
      statuses: STATUS_LABEL, att_status: ATT_STATUS,
      grade_bands: GRADE_BAND_LABEL, conduct_base: CONDUCT_BASE,
      announce_cats: ANNOUNCE_CATS, conduct_cats: CONDUCT_CATS,
      risk_label: RISK_LABEL, econ_label: ECON_LABEL, bmi_label: BMI_LABEL
    };
    _cachePut_('app:public:v' + ver, publicBundle, 300);
  }

  var out = Object.assign({}, publicBundle, { me: null, caps: [] });
  if (token) {
    try {
      var u = Auth_verify_(token);
      out.me = Auth_publicUser_(u);
      out.caps = CAPS[u.role] || [];
    } catch (e) { out.session_invalid = true; }
  }
  return out;
}

/* ════════ Dashboard summary — รวม KPI ตามบทบาทใน 1 call ═══════════ */
function Dash_summary(user, p) {
  var out = { role: user.role, generated_at: cfg_now_() };

  // admin / homeroom / teacher
  var scope = Auth_classScope_(user);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  var classes = DB_readAll(SHEETS.CLASSES).filter(function (c) {
    if (c.status === 'deleted') return false;
    if (scope) return scope.indexOf(c.id) >= 0;
    return true;
  });
  out.kpi = {
    students: students.length, classes: classes.length,
    male: students.filter(function (s) { return s.gender === 'male'; }).length,
    female: students.filter(function (s) { return s.gender === 'female'; }).length
  };
  if (user.role === 'admin') {
    var users = DB_readAll(SHEETS.USERS).filter(function (u) { return u.status === 'active'; });
    out.kpi.teachers = users.filter(function (u) { return u.role === 'homeroom' || u.role === 'teacher'; }).length;
    out.kpi.users = users.length;
  }
  out.attendance = Att_summary(user, { from: p && p.from, to: p && p.to });

  out.visit = Visit_overview(user, {});
  
  if (Auth_can_(user, 'activity.view')) { try { out.activity = Act_overview(user, {}); } catch (e) {} }
  if (Auth_can_(user, 'event.view')) { try { out.events = Event_upcoming(user, { limit: 5 }); } catch (e) {} }
  out.announcements = Announce_list(user, {}).items.slice(0, 5);
  out.classes = Class_list(user, {}).items.slice(0, 8);
  return out;
}
