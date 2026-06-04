/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        09_AnnounceReport.gs — โมดูลประกาศข่าวสาร · รายงานสรุปตามบทบาท
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 */

var ANNOUNCE_CATS = {
  general: 'ทั่วไป', academic: 'วิชาการ', activity: 'กิจกรรม',
  urgent: 'ด่วน', exam: 'สอบ'
};

/* ════════ ANNOUNCEMENTS (ประกาศ) ════════════════════════════════ */
function Announce_list(user, p) {
  Auth_require_(user, 'announce.view');
  p = p || {};
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.ANNOUNCE).filter(function (a) {
    if (a.status === 'deleted') return false;
    if (!Auth_can_(user, 'announce.manage') && a.status !== 'published') return false;
    // กรองตามกลุ่มเป้าหมาย
    if (a.target_role && a.target_role !== 'all' && a.target_role !== user.role && !Auth_can_(user, 'announce.manage')) return false;
    if (a.target_class && user.class_id && a.target_class !== user.class_id && !Auth_can_(user, 'announce.manage')) return false;
    return true;
  });
  if (p.category) rows = rows.filter(function (a) { return a.category === p.category; });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (a) { return (a.title + ' ' + a.body).toLowerCase().indexOf(q) >= 0; });
  }
  rows.sort(function (a, b) {
    var pa = (String(a.pinned) === 'true' || a.pinned === true) ? 1 : 0;
    var pb = (String(b.pinned) === 'true' || b.pinned === true) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (b.publish_at || b.created_at || '').localeCompare(a.publish_at || a.created_at || '');
  });
  return {
    items: rows.map(function (a) {
      var au = userIdx[a.author_id];
      return Object.assign({}, a, {
        pinned: String(a.pinned) === 'true' || a.pinned === true,
        category_label: ANNOUNCE_CATS[a.category] || a.category,
        author_name: au ? au.full_name : '-',
        author_photo: au ? au.photo_url : ''
      });
    })
  };
}

function Announce_save(user, p) {
  Auth_require_(user, 'announce.manage');
  var data = {
    title: String(p.title || '').trim(), body: p.body || '',
    category: p.category || 'general', target_role: p.target_role || 'all',
    target_class: p.target_class || '',
    pinned: p.pinned === true || p.pinned === 'true',
    publish_at: p.publish_at || cfg_now_(), status: p.status || 'published'
  };
  if (!data.title) throw new Error('กรุณาระบุหัวข้อประกาศ');
  if (p.cover) data.cover_url = Files_uploadImage(p.cover, 'announcements', 'ann').url;
  else if (p.cover_url != null) data.cover_url = p.cover_url;

  var saved;
  if (p.id) { saved = DB_update(SHEETS.ANNOUNCE, p.id, data); Audit_log(user, 'update', 'announce', p.id, data.title); }
  else { data.author_id = user.id; data.views = 0; saved = DB_insert(SHEETS.ANNOUNCE, data); Audit_log(user, 'create', 'announce', saved.id, data.title); }
  return saved;
}

function Announce_view(user, p) {
  var a = DB_get(SHEETS.ANNOUNCE, p.id);
  if (!a) throw new Error('ไม่พบประกาศ');
  DB_update(SHEETS.ANNOUNCE, p.id, { views: Number(a.views || 0) + 1 });
  return a;
}

function Announce_delete(user, p) {
  Auth_require_(user, 'announce.manage');
  DB_softDelete(SHEETS.ANNOUNCE, p.id);
  Audit_log(user, 'delete', 'announce', p.id, '');
  return true;
}

/* ════════ REPORTS (รายงานสรุปตามบทบาท) ══════════════════════════ */
function Report_overview(user, p) {
  Auth_require_(user, 'report.view');
  var scope = Auth_classScope_(user);
  var students = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  var classIdx = DB_index(SHEETS.CLASSES);

  // การกระจายตามชั้น
  var byClass = {};
  students.forEach(function (s) {
    var c = classIdx[s.class_id];
    var key = c ? (c.level + '/' + c.room) : 'ไม่ระบุ';
    if (!byClass[key]) byClass[key] = { label: key, male: 0, female: 0, total: 0 };
    byClass[key].total++;
    if (s.gender === 'male') byClass[key].male++; else if (s.gender === 'female') byClass[key].female++;
  });
  var classRows = Object.keys(byClass).map(function (k) {
    var r = byClass[k]; return r;
  }).sort(function (a, b) { return a.label.localeCompare(b.label, 'th'); });

  var male = students.filter(function (s) { return s.gender === 'male'; }).length;
  var female = students.filter(function (s) { return s.gender === 'female'; }).length;

  return {
    totalStudents: students.length, male: male, female: female,
    totalClasses: classRows.length, byClass: classRows,
    attendance: Att_summary(user, { from: p.from, to: p.to, class_id: p.class_id }),
    visit: Visit_overview(user, {}),
  };
}

// Audit log viewer (admin)
function Audit_list(user, p) {
  Auth_require_(user, '*');
  p = p || {};
  var userIdx = DB_index(SHEETS.USERS);
  var rows = DB_readAll(SHEETS.AUDIT);
  if (p.action) rows = rows.filter(function (a) { return a.action === p.action; });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (a) { return (a.username + ' ' + a.detail + ' ' + a.entity).toLowerCase().indexOf(q) >= 0; });
  }
  rows.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });
  var total = rows.length, page = p.page || 1, size = p.size || 80;
  return {
    items: rows.slice((page - 1) * size, page * size).map(function (a) {
      var u = userIdx[a.user_id];
      return Object.assign({}, a, { photo_url: u ? u.photo_url : '' });
    }),
    total: total, page: page, size: size
  };
}
