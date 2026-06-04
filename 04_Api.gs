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

    /* ── Conduct ── */
    case 'conduct.meta':     return Conduct_meta();
    case 'conduct.record':   return Conduct_record(user, p);
    case 'conduct.history':  return Conduct_history(user, p);
    case 'conduct.overview': return Conduct_overview(user, p);

    /* ── Home visits (กสศ.01) ── */
    case 'visit.meta':      return Visit_meta();
    case 'visit.list':      return Visit_list(user, p);
    case 'visit.get':       return Visit_get(user, p);
    case 'visit.save':      return Visit_save(user, p);
    case 'visit.delete':    return Visit_delete(user, p);
    case 'visit.overview':  return Visit_overview(user, p);

    /* ── Health ── */
    case 'health.list':     return Health_list(user, p);
    case 'health.save':     return Health_save(user, p);
    case 'health.delete':   return Health_delete(user, p);

    /* ── Care (ดูแลช่วยเหลือนักเรียน) ── */
    case 'care.sdq_meta':    return Care_sdqMeta();
    case 'care.sdq_save':    return Care_sdqSave(user, p);
    case 'care.sdq_history': return Care_sdqHistory(user, p);
    case 'care.sdq_list':    return Care_sdqList(user, p);
    case 'care.screen_meta': return Care_screenMeta();
    case 'care.screen_save': return Care_screenSave(user, p);
    case 'care.screen_list': return Care_screenList(user, p);

    /* ── Leave (ขอลาออนไลน์) ── */
    case 'leave.meta':       return Leave_meta();
    case 'leave.request':    return Leave_request(user, p);
    case 'leave.list':       return Leave_list(user, p);
    case 'leave.review':     return Leave_review(user, p);

    /* ── วัดผล & เอกสาร ปพ. ── */
    case 'grade.meta':       return Grade_meta();
    case 'subject.list':     return Subject_list(user, p);
    case 'subject.save':     return Subject_save(user, p);
    case 'subject.delete':   return Subject_delete(user, p);
    case 'grade.sheet':      return Grade_sheet(user, p);
    case 'grade.save':       return Grade_saveBulk(user, p);
    case 'grade.student':    return Grade_studentTerm(user, p);
    case 'grade.roster':     return Grade_classRoster(user, p);
    case 'eval.sheet':       return Eval_sheet(user, p);
    case 'eval.save':        return Eval_save(user, p);
    case 'report.card':      return ReportCard_data(user, p);
    case 'report.transcript':return Transcript_data(user, p);

    /* ── บริหารห้องเรียน (เวร/กรรมการ/ผังที่นั่ง/ตารางเรียน) ── */
    case 'classroom.meta':   return Classroom_meta();
    case 'duty.get':         return Duty_get(user, p);
    case 'duty.save':        return Duty_save(user, p);
    case 'duty.auto':        return Duty_auto(user, p);
    case 'committee.get':    return Committee_get(user, p);
    case 'committee.save':   return Committee_save(user, p);
    case 'seating.get':      return Seating_get(user, p);
    case 'seating.save':     return Seating_save(user, p);
    case 'timetable.get':    return Timetable_get(user, p);
    case 'timetable.save':   return Timetable_save(user, p);
    case 'classroom.mine':   return Classroom_mine(user);

    /* ── Savings (ออมเงิน) ── */
    case 'sav.list':        return Sav_list(user, p);
    case 'sav.passbook':    return Sav_passbook(user, p);
    case 'sav.record':      return Sav_record(user, p);
    case 'sav.overview':    return Sav_overview(user, p);

    /* ── เงินกิจกรรม · กิจกรรมพัฒนาผู้เรียน · ปฏิทิน (ชุด D) ── */
    case 'extra.meta':       return Extra_meta();
    case 'fund.list':        return FundItem_list(user, p);
    case 'fund.save':        return FundItem_save(user, p);
    case 'fund.delete':      return FundItem_delete(user, p);
    case 'fund.detail':      return Fund_itemDetail(user, p);
    case 'fund.pay':         return Fund_payBulk(user, p);
    case 'fund.dues':        return Fund_studentDues(user, p);
    case 'fund.overview':    return Fund_overview(user, p);
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

  if (user.role === 'student') {
    var att = Att_history(user, { limit: 30 });
    var con = Conduct_history(user, {});
    out.student = {
      attendance: att.stat,
      attendance_total: att.total,
      present_rate: att.total ? Math.round(((att.stat.present + att.stat.late) / att.total) * 100) : 100,
      conduct_score: con.score, conduct_added: con.added, conduct_deducted: con.deducted,
      profile: con.student,
      recent_conduct: con.items.slice(0, 5),
      recent_att: att.items.slice(0, 7)
    };
    try { var sb = Sav_passbook(user, {}); out.student.savings = { balance: sb.balance, deposits: sb.deposits, withdrawals: sb.withdrawals, count: sb.count }; } catch (e) {}
    try {
      var ag = DB_readAll(SHEETS.GRADES).filter(function (g) { return g.student_id === user.student_id; }).map(function (g) { return { grade: g.grade, credit: Number(g.credit) }; });
      var gp = _gpa_(ag); out.student.gpa = gp.gpa; out.student.subj_count = ag.length;
    } catch (e) {}
    try { var du = Fund_studentDues(user, {}); out.student.fund = { outstanding: du.outstanding, totalDue: du.totalDue }; } catch (e) {}
    try { out.student.activity_hours = Act_studentSummary(user, {}).total; } catch (e) {}
    try { out.events = Event_upcoming(user, { limit: 5 }); } catch (e) {}
    out.announcements = Announce_list(user, {}).items.slice(0, 5);
    return out;
  }

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
  out.conduct = Conduct_overview(user, {});
  out.visit = Visit_overview(user, {});
  out.health = Health_overview(user, {});
  if (Auth_can_(user, 'savings.view')) { try { out.savings = Sav_overview(user, {}); } catch (e) {} }
  if (Auth_can_(user, 'care.view')) { try { out.care = Care_screenList(user, {}); out.care = { counts: out.care.counts, total: out.care.total }; } catch (e) {} }
  if (Auth_can_(user, 'leave.view')) { try { out.leave_pending = Leave_list(user, { status: 'pending' }).items.length; } catch (e) {} }
  if (Auth_can_(user, 'grade.view')) {
    try {
      var byStu = {};
      DB_readAll(SHEETS.GRADES).forEach(function (g) {
        if (scope && scope.indexOf(g.class_id) < 0) return;
        (byStu[g.student_id] = byStu[g.student_id] || []).push({ grade: g.grade, credit: Number(g.credit) });
      });
      var sum = 0, n = 0;
      Object.keys(byStu).forEach(function (k) { var gp = _gpa_(byStu[k]); if (gp.credit > 0) { sum += gp.gpa; n++; } });
      out.academic = { avg_gpa: n ? Math.round((sum / n) * 100) / 100 : 0, graded: n };
    } catch (e) {}
  }
  if (Auth_can_(user, 'fund.view')) { try { out.fund = Fund_overview(user, {}); } catch (e) {} }
  if (Auth_can_(user, 'activity.view')) { try { out.activity = Act_overview(user, {}); } catch (e) {} }
  if (Auth_can_(user, 'event.view')) { try { out.events = Event_upcoming(user, { limit: 5 }); } catch (e) {} }
  out.announcements = Announce_list(user, {}).items.slice(0, 5);
  out.classes = Class_list(user, {}).items.slice(0, 8);
  return out;
}
