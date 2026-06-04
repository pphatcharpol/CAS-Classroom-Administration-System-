/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        12_Savings.gs — โมดูลออมเงินนักเรียน (ฝาก/ถอน · running balance · ประวัติ)
 *  Version:     1.1.0
 *  Last Update: 2026-05-31
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  เก็บเป็น "transaction ledger" — ทุกฝาก/ถอนคือ 1 แถว + เก็บ running balance ณ ตอนนั้น
 *  ยอดคงเหลือของนักเรียน = balance ของ transaction ล่าสุด
 */

// คำนวณยอดคงเหลือล่าสุด + สรุปของนักเรียนคนเดียว
function Sav_account_(studentId, allTx) {
  var tx = (allTx || DB_readAll(SHEETS.SAVINGS)).filter(function (t) { return t.student_id === studentId; });
  tx.sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
  var bal = 0, dep = 0, wd = 0;
  tx.forEach(function (t) {
    var amt = Number(t.amount || 0);
    if (t.type === 'withdraw') { bal -= amt; wd += amt; } else { bal += amt; dep += amt; }
  });
  return { balance: bal, deposits: dep, withdrawals: wd, count: tx.length, last: tx.length ? tx[tx.length - 1] : null };
}

// บันทึกฝาก/ถอน (validate ยอดถอนไม่เกินคงเหลือ)
function Sav_record(user, p) {
  Auth_require_(user, 'savings.manage');
  var s = DB_get(SHEETS.STUDENTS, p.student_id);
  if (!s) throw new Error('ไม่พบนักเรียน');
  var type = p.type === 'withdraw' ? 'withdraw' : 'deposit';
  var amount = Math.round(Number(p.amount || 0) * 100) / 100;
  if (!(amount > 0)) throw new Error('กรุณาระบุจำนวนเงินให้ถูกต้อง');

  var acc = Sav_account_(s.id);
  var newBal = type === 'withdraw' ? acc.balance - amount : acc.balance + amount;
  if (type === 'withdraw' && newBal < 0) throw new Error('ยอดเงินคงเหลือไม่เพียงพอ (คงเหลือ ' + acc.balance.toLocaleString('th-TH') + ' บาท)');

  var ref = (type === 'deposit' ? 'DEP' : 'WD') + '-' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyMMdd') + '-' + (acc.count + 1);
  var rec = DB_insert(SHEETS.SAVINGS, {
    tx_date: p.tx_date || cfg_dateOnly_(new Date()),
    student_id: s.id, class_id: s.class_id, type: type, amount: amount,
    balance: newBal, note: p.note || '', ref_no: ref, recorded_by: user.id
  });
  Audit_log(user, 'savings', 'student', s.id, (type === 'deposit' ? 'ฝาก' : 'ถอน') + ' ' + amount + ' บาท (คงเหลือ ' + newBal + ')');
  return { record: rec, balance: newBal };
}

// ประวัติการฝาก/ถอนรายคน (สมุดบัญชี) + สรุป
function Sav_passbook(user, p) {
  var sid = p.student_id;
  if (user.role === 'student') sid = user.student_id;
  else Auth_require_(user, 'savings.view');
  if (!sid) throw new Error('ไม่พบนักเรียน');

  var s = DB_get(SHEETS.STUDENTS, sid);
  if (user.role !== 'student' && user.role !== 'admin') {
    var scope = Auth_classScope_(user);
    if (scope && scope.indexOf(s.class_id) < 0) throw new Error('PERMISSION_DENIED');
  }
  var userIdx = DB_index(SHEETS.USERS);
  var tx = DB_readAll(SHEETS.SAVINGS).filter(function (t) { return t.student_id === sid; });
  tx.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }); // ใหม่สุดก่อน (สำหรับแสดง)
  var acc = Sav_account_(sid);
  return {
    student: s ? Student_enrich_(s, DB_index(SHEETS.CLASSES)) : null,
    balance: acc.balance, deposits: acc.deposits, withdrawals: acc.withdrawals, count: acc.count,
    items: tx.map(function (t) {
      var by = userIdx[t.recorded_by];
      return Object.assign({}, t, { amount: Number(t.amount), balance: Number(t.balance), recorder_name: by ? by.full_name : (t.recorded_by === 'system' ? 'ระบบ' : '-') });
    })
  };
}

// รายชื่อนักเรียน + ยอดคงเหลือ (สำหรับหน้าออมเงิน) ตามขอบเขตสิทธิ์
function Sav_list(user, p) {
  Auth_require_(user, 'savings.view');
  p = p || {};
  var scope = Auth_classScope_(user);
  var classIdx = DB_index(SHEETS.CLASSES);
  var allTx = DB_readAll(SHEETS.SAVINGS);

  // pre-aggregate balance per student (O(n) ครั้งเดียว)
  var agg = {};
  allTx.forEach(function (t) {
    var a = agg[t.student_id] || (agg[t.student_id] = { balance: 0, count: 0, last: '' });
    a.balance += (t.type === 'withdraw' ? -1 : 1) * Number(t.amount || 0);
    a.count++;
    if ((t.tx_date || '') > a.last) a.last = t.tx_date || '';
  });

  var rows = DB_readAll(SHEETS.STUDENTS).filter(function (s) {
    if (s.status !== 'active') return false;
    if (p.class_id) return s.class_id === p.class_id;
    if (scope) return scope.indexOf(s.class_id) >= 0;
    return true;
  });
  if (p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (s) { return (s.student_code + ' ' + s.first_name + ' ' + s.last_name + ' ' + s.nickname).toLowerCase().indexOf(q) >= 0; });
  }
  rows = rows.map(function (s) {
    var a = agg[s.id] || { balance: 0, count: 0, last: '' };
    return Object.assign(Student_enrich_(s, classIdx), { balance: a.balance, tx_count: a.count, last_tx: a.last });
  });
  if (p.sort === 'balance') rows.sort(function (a, b) { return b.balance - a.balance; });
  else rows.sort(function (a, b) { if (a.class_id !== b.class_id) return a.class_label.localeCompare(b.class_label, 'th'); return (Number(a.number) || 999) - (Number(b.number) || 999); });

  var total = rows.length, page = p.page || 1, size = p.size || 60;
  return { items: rows.slice((page - 1) * size, page * size), total: total, page: page, size: size };
}

// ภาพรวมออมเงิน (KPI dashboard/page)
function Sav_overview(user, p) {
  Auth_require_(user, 'savings.view');
  var scope = Auth_classScope_(user);
  var allTx = DB_readAll(SHEETS.SAVINGS).filter(function (t) {
    if (scope) return scope.indexOf(t.class_id) >= 0;
    return true;
  });
  var totalBal = 0, totalDep = 0, totalWd = 0, savers = {};
  allTx.forEach(function (t) {
    var amt = Number(t.amount || 0);
    if (t.type === 'withdraw') { totalBal -= amt; totalWd += amt; } else { totalBal += amt; totalDep += amt; }
    savers[t.student_id] = true;
  });
  // เคลื่อนไหวล่าสุด 8 รายการ
  var stdIdx = DB_index(SHEETS.STUDENTS);
  var recent = allTx.slice().sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); }).slice(0, 8).map(function (t) {
    var s = stdIdx[t.student_id];
    return Object.assign({}, t, { amount: Number(t.amount), balance: Number(t.balance), student_name: s ? ((s.title || '') + s.first_name + ' ' + s.last_name) : '-' });
  });
  return { balance: totalBal, deposits: totalDep, withdrawals: totalWd, savers: Object.keys(savers).length, tx_count: allTx.length, recent: recent };
}
