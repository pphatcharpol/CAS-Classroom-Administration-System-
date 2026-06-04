/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        16_Extra.gs — เงินกิจกรรม/กองทุนห้อง · กิจกรรมพัฒนาผู้เรียน/จิตอาสา · ปฏิทินกิจกรรม
 *  Version:     1.5.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

// กิจกรรมพัฒนาผู้เรียน (หลักสูตรแกนกลาง 2551)
var ACTIVITY_TYPES = [
  { key: 'guidance', label: 'กิจกรรมแนะแนว', icon: 'compass' },
  { key: 'scout', label: 'ลูกเสือ/เนตรนารี/ยุวกาชาด', icon: 'flag-fill' },
  { key: 'club', label: 'ชุมนุม/ชมรม', icon: 'people-fill' },
  { key: 'social', label: 'จิตอาสา/เพื่อสังคมและสาธารณประโยชน์', icon: 'heart-fill' },
  { key: 'other', label: 'อื่น ๆ', icon: 'star-fill' }
];
var EVENT_TYPES = {
  academic: { label: 'วิชาการ', color: '#1565C0' }, exam: { label: 'สอบ', color: '#C62828' },
  activity: { label: 'กิจกรรม', color: '#2E7D32' }, holiday: { label: 'วันหยุด', color: '#D98E04' },
  meeting: { label: 'ประชุม', color: '#6A1B9A' }, sport: { label: 'กีฬา', color: '#00838F' },
  general: { label: 'ทั่วไป', color: '#8A6608' }
};

function Extra_meta() {
  return {activity_types: ACTIVITY_TYPES, event_types: EVENT_TYPES };
}


/* ════════ กิจกรรมพัฒนาผู้เรียน / จิตอาสา ════════════════════════ */
function Act_list(user, p) {
  p = p || {};
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'activity.view');
  var scope = Auth_classScope_(user);
  var stdIdx = DB_index(SHEETS.STUDENTS), classIdx = DB_index(SHEETS.CLASSES);
  var rows = DB_readAll(SHEETS.ACTIVITY).filter(function (a) {
    if (sid) return a.student_id === sid;
    if (p.class_id) return a.class_id === p.class_id;
    if (scope) return scope.indexOf(a.class_id) >= 0;
    return true;
  });
  if (p.type) rows = rows.filter(function (a) { return a.activity_type === p.type; });
  rows.sort(function (a, b) { return (b.activity_date || '').localeCompare(a.activity_date || ''); });
  var typeLabel = {}; ACTIVITY_TYPES.forEach(function (t) { typeLabel[t.key] = t.label; });
  return {
    items: rows.slice(0, p.limit || 200).map(function (a) {
      var s = stdIdx[a.student_id];
      return Object.assign({}, a, { hours: Number(a.hours), student_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-', type_label: typeLabel[a.activity_type] || a.activity_type, class_label: s && classIdx[s.class_id] ? (classIdx[s.class_id].level + '/' + classIdx[s.class_id].room) : '' });
    })
  };
}

function Act_save(user, p) {
  Auth_require_(user, 'activity.manage');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var data = {
    student_id: s.id, class_id: s.class_id, academic_year: p.academic_year || cfg_academicYear_(),
    activity_type: p.activity_type || 'social', title: String(p.title || '').trim(), hours: Number(p.hours || 0),
    activity_date: p.activity_date || cfg_dateOnly_(new Date()), location: p.location || '', note: p.note || '', recorded_by: user.id
  };
  if (!data.title) throw new Error('กรุณาระบุชื่อกิจกรรม');
  if (!(data.hours > 0)) throw new Error('กรุณาระบุจำนวนชั่วโมง');
  var rec = DB_insert(SHEETS.ACTIVITY, data);
  Audit_log(user, 'activity', 'student', s.id, data.title + ' ' + data.hours + ' ชม.');
  return rec;
}

function Act_delete(user, p) {
  Auth_require_(user, 'activity.manage');
  DB_delete(SHEETS.ACTIVITY, p.id);
  Audit_log(user, 'delete', 'activity', p.id, '');
  return true;
}

// สรุปชั่วโมงรายคน แยกตามประเภท
function Act_studentSummary(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'activity.view');
  var rows = DB_readAll(SHEETS.ACTIVITY).filter(function (a) { return a.student_id === sid; });
  var byType = {}; ACTIVITY_TYPES.forEach(function (t) { byType[t.key] = 0; });
  var total = 0;
  rows.forEach(function (a) { var h = Number(a.hours || 0); byType[a.activity_type] = (byType[a.activity_type] || 0) + h; total += h; });
  return { byType: byType, total: total, count: rows.length };
}

function Act_overview(user, p) {
  Auth_require_(user, 'activity.view');
  var scope = Auth_classScope_(user);
  var rows = DB_readAll(SHEETS.ACTIVITY).filter(function (a) { if (scope) return scope.indexOf(a.class_id) >= 0; return true; });
  var byType = {}; ACTIVITY_TYPES.forEach(function (t) { byType[t.key] = 0; });
  var total = 0, students = {};
  rows.forEach(function (a) { var h = Number(a.hours || 0); byType[a.activity_type] = (byType[a.activity_type] || 0) + h; total += h; students[a.student_id] = true; });
  return { total: total, count: rows.length, students: Object.keys(students).length, byType: byType };
}

/* ════════ ปฏิทินกิจกรรม (Events) ════════════════════════════════ */
function _eventVisible_(user, e) {
  if (Auth_can_(user, 'event.manage')) return true;
  if (e.target_role && e.target_role !== 'all' && e.target_role !== user.role) return false;
  if (e.target_class && user.class_id && e.target_class !== user.class_id) return false;
  return true;
}

function Event_list(user, p) {
  Auth_require_(user, 'event.view');
  p = p || {};
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.EVENTS).filter(function (e) {
    if (e.status === 'deleted') return false;
    if (!_eventVisible_(user, e)) return false;
    if (p.from && cfg_d10_(e.event_date) < cfg_d10_(p.from)) return false;
    if (p.to && cfg_d10_(e.event_date) > cfg_d10_(p.to)) return false;
    if (p.month && cfg_d10_(e.event_date).substring(0, 7) !== p.month) return false;
    if (p.type && e.event_type !== p.type) return false;
    return true;
  });
  rows.sort(function (a, b) { return cfg_d10_(a.event_date).localeCompare(cfg_d10_(b.event_date)); });
  return {
    items: rows.map(function (e) {
      var au = userIdx[e.created_by];
      return Object.assign({}, e, { type_label: (EVENT_TYPES[e.event_type] || {}).label || e.event_type, type_color: e.color || (EVENT_TYPES[e.event_type] || {}).color || '#8A6608', author_name: au ? au.full_name : '-' });
    })
  };
}

function Event_upcoming(user, p) {
  Auth_require_(user, 'event.view');
  var today = cfg_dateOnly_(new Date());
  var rows = DB_readAll(SHEETS.EVENTS).filter(function (e) { return e.status !== 'deleted' && _eventVisible_(user, e) && cfg_d10_(e.event_date) >= today; });
  rows.sort(function (a, b) { return cfg_d10_(a.event_date).localeCompare(cfg_d10_(b.event_date)); });
  return rows.slice(0, (p && p.limit) || 6).map(function (e) {
    return Object.assign({}, e, { type_label: (EVENT_TYPES[e.event_type] || {}).label || e.event_type, type_color: e.color || (EVENT_TYPES[e.event_type] || {}).color || '#8A6608' });
  });
}

function Event_save(user, p) {
  Auth_require_(user, 'event.manage');
  var data = {
    title: String(p.title || '').trim(), event_type: p.event_type || 'general',
    event_date: cfg_d10_(p.event_date), end_date: p.end_date ? cfg_d10_(p.end_date) : '',
    time: p.time || '', location: p.location || '', target_role: p.target_role || 'all',
    target_class: p.target_class || '', description: p.description || '',
    color: p.color || (EVENT_TYPES[p.event_type] || {}).color || '', status: 'active'
  };
  if (!data.title) throw new Error('กรุณาระบุชื่อกิจกรรม');
  if (!data.event_date) throw new Error('กรุณาระบุวันที่');
  var saved;
  if (p.id) { saved = DB_update(SHEETS.EVENTS, p.id, data); Audit_log(user, 'update', 'event', p.id, data.title); }
  else { data.created_by = user.id; saved = DB_insert(SHEETS.EVENTS, data); Audit_log(user, 'create', 'event', saved.id, data.title); }
  return saved;
}

function Event_delete(user, p) {
  Auth_require_(user, 'event.manage');
  DB_softDelete(SHEETS.EVENTS, p.id);
  Audit_log(user, 'delete', 'event', p.id, '');
  return true;
}
