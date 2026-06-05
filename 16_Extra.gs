/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        16_Extra.gs — เงินกิจกรรม/กองทุนห้อง · กิจกรรมพัฒนาผู้เรียน/จิตอาสา · ปฏิทินกิจกรรม
 *  Version:     1.5.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูที
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var EVENT_TYPES = {
  academic: { label: 'วิชาการ', color: '#1565C0' }, exam: { label: 'สอบ', color: '#C62828' },
  activity: { label: 'กิจกรรม', color: '#2E7D32' }, holiday: { label: 'วันหยุด', color: '#D98E04' },
  meeting: { label: 'ประชุม', color: '#6A1B9A' }, sport: { label: 'กีฬา', color: '#00838F' },
  general: { label: 'ทั่วไป', color: '#8A6608' }
};

function Extra_meta() {
  return { event_types: EVENT_TYPES };
}

/* ════════ ปฏิทินกิจกรรม (Events) ════════════════════════════════ */
function _eventVisible_(user, e) {
  if (Auth_can_(user, 'event.manage')) return true;
  if (e.target_role && e.target_role !== 'all' && e.target_role !== user.role) return false;
  if (e.target_class && user.class_id && e.target_class !== user.class_id) return false;
  return true;
}

function Event_list(user, p) {
  Auth_require_(user, 'event.view'); p = p || {};
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.EVENTS).filter(function (e) {
    if (e.status === 'deleted' || !_eventVisible_(user, e)) return false;
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
  if (!data.title || !data.event_date) throw new Error('กรุณาระบุชื่อและวันที่');
  var saved;
  if (p.id) { saved = DB_update(SHEETS.EVENTS, p.id, data); Audit_log(user, 'update', 'event', p.id, data.title); }
  else { data.created_by = user.id; saved = DB_insert(SHEETS.EVENTS, data); Audit_log(user, 'create', 'event', saved.id, data.title); }
  return saved;
}

function Event_delete(user, p) {
  Auth_require_(user, 'event.manage');
  DB_softDelete(SHEETS.EVENTS, p.id); Audit_log(user, 'delete', 'event', p.id, '');
  return true;
}
