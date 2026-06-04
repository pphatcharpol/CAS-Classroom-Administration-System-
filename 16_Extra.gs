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

var FUND_METHODS = { cash: 'เงินสด', transfer: 'โอนเงิน', other: 'อื่น ๆ' };
var FUND_CATS = { activity: 'ค่ากิจกรรม', material: 'ค่าอุปกรณ์/เอกสาร', trip: 'ทัศนศึกษา', fund: 'กองทุนห้อง', other: 'อื่น ๆ' };
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
  return { fund_methods: FUND_METHODS, fund_cats: FUND_CATS, activity_types: ACTIVITY_TYPES, event_types: EVENT_TYPES };
}

/* ════════ เงินกิจกรรม / กองทุนห้อง ══════════════════════════════ */
function FundItem_list(user, p) {
  Auth_require_(user, 'fund.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  // นับนักเรียน active ต่อห้อง
  var sizeByClass = {};
  DB_readAll(SHEETS.STUDENTS).forEach(function (s) { if (s.status === 'active') sizeByClass[s.class_id] = (sizeByClass[s.class_id] || 0) + 1; });
  // payments รวมต่อ item
  var payAgg = {};
  DB_readAll(SHEETS.FUND_PAY).forEach(function (pm) {
    if (String(pm.paid) === 'true' || pm.paid === true) {
      var a = payAgg[pm.item_id] || (payAgg[pm.item_id] = { count: 0, collected: 0 });
      a.count++; a.collected += Number(pm.paid_amount || 0);
    }
  });
  var rows = DB_readAll(SHEETS.FUND_ITEMS).filter(function (it) {
    if (it.status === 'deleted') return false;
    if (p.class_id) return it.class_id === p.class_id;
    if (scope) return scope.indexOf(it.class_id) >= 0;
    return true;
  });
  if (p.year) rows = rows.filter(function (it) { return String(it.academic_year) === String(p.year); });
  rows.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  return {
    items: rows.map(function (it) {
      var c = classIdx[it.class_id]; var size = sizeByClass[it.class_id] || 0;
      var agg = payAgg[it.id] || { count: 0, collected: 0 };
      return Object.assign({}, it, {
        amount: Number(it.amount), class_label: c ? (c.level + '/' + c.room) : '-',
        cat_label: FUND_CATS[it.category] || it.category, class_size: size,
        paid_count: agg.count, collected: agg.collected,
        expected: Number(it.amount) * size, outstanding_count: Math.max(0, size - agg.count)
      });
    })
  };
}

function FundItem_save(user, p) {
  Auth_require_(user, 'fund.manage');
  var data = {
    class_id: p.class_id, academic_year: p.academic_year || cfg_academicYear_(), term: p.term || '1',
    title: String(p.title || '').trim(), amount: Number(p.amount || 0),
    due_date: p.due_date || '', category: p.category || 'activity', note: p.note || '',
    status: p.status || 'active'
  };
  if (!data.class_id) throw new Error('กรุณาเลือกชั้นเรียน');
  if (!data.title) throw new Error('กรุณาระบุชื่อรายการ');
  var saved;
  if (p.id) { saved = DB_update(SHEETS.FUND_ITEMS, p.id, data); Audit_log(user, 'update', 'fund_item', p.id, data.title); }
  else { data.created_by = user.id; saved = DB_insert(SHEETS.FUND_ITEMS, data); Audit_log(user, 'create', 'fund_item', saved.id, data.title + ' ' + data.amount); }
  return saved;
}

function FundItem_delete(user, p) {
  Auth_require_(user, 'fund.manage');
  DB_softDelete(SHEETS.FUND_ITEMS, p.id);
  Audit_log(user, 'delete', 'fund_item', p.id, '');
  return true;
}

// รายการเก็บเงิน + สถานะชำระรายคน (สำหรับ mark จ่าย)
function Fund_itemDetail(user, p) {
  Auth_require_(user, 'fund.view');
  var it = DB_get(SHEETS.FUND_ITEMS, p.item_id);
  if (!it) throw new Error('ไม่พบรายการ');
  var classIdx = DB_index(SHEETS.CLASSES);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) { return s.class_id === it.class_id && s.status === 'active'; })
    .map(function (s) { return Student_enrich_(s, classIdx); })
    .sort(function (a, b) { return (Number(a.number) || 999) - (Number(b.number) || 999); });
  var payByStudent = {};
  DB_readAll(SHEETS.FUND_PAY).forEach(function (pm) { if (pm.item_id === p.item_id) payByStudent[pm.student_id] = pm; });
  return {
    item: Object.assign({}, it, { amount: Number(it.amount), class_label: classIdx[it.class_id] ? (classIdx[it.class_id].level + '/' + classIdx[it.class_id].room) : '' }),
    students: students.map(function (s) {
      var pm = payByStudent[s.id];
      return { student_id: s.id, number: s.number, full_name: s.full_name, photo_url: s.photo_url, paid: pm ? (String(pm.paid) === 'true' || pm.paid === true) : false, paid_amount: pm ? Number(pm.paid_amount) : Number(it.amount), receipt_no: pm ? pm.receipt_no : '', pay_id: pm ? pm.id : '' };
    })
  };
}

function Fund_payBulk(user, p) {
  Auth_require_(user, 'fund.manage');
  var it = DB_get(SHEETS.FUND_ITEMS, p.item_id);
  if (!it) throw new Error('ไม่พบรายการ');
  var existing = {};
  DB_readAll(SHEETS.FUND_PAY).forEach(function (pm) { if (pm.item_id === p.item_id) existing[pm.student_id] = pm; });
  var now = cfg_now_(), seq = 1, toInsert = [], updated = 0;
  (p.records || []).forEach(function (r) {
    var paid = r.paid === true || r.paid === 'true';
    var amt = paid ? (r.paid_amount != null ? Number(r.paid_amount) : Number(it.amount)) : 0;
    var ex = existing[r.student_id];
    if (ex) {
      var exPaid = (String(ex.paid) === 'true' || ex.paid === true);
      if (exPaid !== paid || Number(ex.paid_amount || 0) !== amt) {
        DB_update(SHEETS.FUND_PAY, ex.id, { paid: paid, paid_amount: amt, paid_date: paid ? cfg_dateOnly_(new Date()) : '', method: r.method || ex.method || 'cash', recorded_by: user.id });
        updated++;
      }
    } else if (paid) {
      toInsert.push({ item_id: p.item_id, student_id: r.student_id, class_id: it.class_id, paid: true, paid_amount: amt, paid_date: cfg_dateOnly_(new Date()), method: r.method || 'cash', receipt_no: 'RC' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyMMdd') + '-' + (seq++), note: '', recorded_by: user.id });
    }
  });
  if (toInsert.length) DB_bulkInsert(SHEETS.FUND_PAY, toInsert);
  Audit_log(user, 'fund_pay', 'fund_item', p.item_id, it.title + ' (+' + toInsert.length + '/~' + updated + ')');
  return { inserted: toInsert.length, updated: updated };
}

// รายการที่นักเรียนต้องชำระ (self)
function Fund_studentDues(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'fund.view');
  var s = DB_get(SHEETS.STUDENTS, sid);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var payByItem = {};
  DB_readAll(SHEETS.FUND_PAY).forEach(function (pm) { if (pm.student_id === sid) payByItem[pm.item_id] = pm; });
  var items = DB_readAll(SHEETS.FUND_ITEMS).filter(function (it) { return it.class_id === s.class_id && it.status !== 'deleted'; });
  items.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  var totalDue = 0, totalPaid = 0;
  var list = items.map(function (it) {
    var pm = payByItem[it.id]; var paid = pm ? (String(pm.paid) === 'true' || pm.paid === true) : false;
    totalDue += Number(it.amount); if (paid) totalPaid += Number(pm.paid_amount || it.amount);
    return Object.assign({}, it, { amount: Number(it.amount), cat_label: FUND_CATS[it.category] || it.category, paid: paid, paid_date: pm ? pm.paid_date : '', receipt_no: pm ? pm.receipt_no : '' });
  });
  return { student: Student_enrich_(s, DB_index(SHEETS.CLASSES)), items: list, totalDue: totalDue, totalPaid: totalPaid, outstanding: totalDue - totalPaid };
}

function Fund_overview(user, p) {
  Auth_require_(user, 'fund.view');
  var scope = Auth_classScope_(user);
  var sizeByClass = {};
  DB_readAll(SHEETS.STUDENTS).forEach(function (s) { if (s.status === 'active') sizeByClass[s.class_id] = (sizeByClass[s.class_id] || 0) + 1; });
  var items = DB_readAll(SHEETS.FUND_ITEMS).filter(function (it) { if (it.status === 'deleted') return false; if (scope) return scope.indexOf(it.class_id) >= 0; return true; });
  var itemIds = {}; items.forEach(function (it) { itemIds[it.id] = it; });
  var expected = 0; items.forEach(function (it) { expected += Number(it.amount) * (sizeByClass[it.class_id] || 0); });
  var collected = 0, paidCount = 0;
  DB_readAll(SHEETS.FUND_PAY).forEach(function (pm) { if (itemIds[pm.item_id] && (String(pm.paid) === 'true' || pm.paid === true)) { collected += Number(pm.paid_amount || 0); paidCount++; } });
  return { items: items.length, expected: expected, collected: collected, outstanding: Math.max(0, expected - collected), paid_count: paidCount };
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
