/**
 * ═══════════════════════════════════════════════════════════════
 *  CAS · ระบบงานธุรการชั้นเรียน (Classroom Administration System)
 *  File:        01_DB.gs — Data layer · Cache read-through · Version invalidation · CRUD · Bulk
 *  Version:     1.0.0
 *  Last Update: 2026-05-30
 *  Developer:   ครูวิรัตน์  หาดคำ · www.kruwirat.com
 *  License:     Proprietary · © 2026
 * ═══════════════════════════════════════════════════════════════
 *  Performance: รองรับ 100K+ แถว — O(1) lookup ผ่าน index · cache 5 นาที + version bump
 *  ทุก read ผ่าน CacheService (chunked) · ทุก write ผ่าน setValues() ครั้งเดียว
 */

var CACHE_TTL = 300; // 5 นาที (ปลอดภัยเพราะมี version invalidation)

/* ── L1 in-memory memo (เร็วสุด) — อยู่ใน V8 container ที่ warm, keyed ด้วย version
 *    → ปลอดภัยข้าม request: ถ้ามี write ที่ไหน version เปลี่ยน → key ไม่ตรง → อ่านใหม่
 *    ลดการ parse JSON ซ้ำของชีตเดียวกันในคำขอเดียว (เช่น dashboard อ่าน Students หลายรอบ) ── */
var __L1 = {};         // name -> { ver, data }
var __VERMEMO = null;  // cache ScriptProperties ทั้งก้อนต่อ 1 request
var __BATCH = false;   // batch write mode (seed/import) — defer flush + version bump
var __BATCH_DIRTY = {};// scope -> true (รอ bump ตอน endBatch)

/* ── Cache primitives (chunked support สำหรับ payload > 95KB) ──────── */
function _cache_() { return CacheService.getScriptCache(); }

function _cacheGet_(key) {
  try {
    var raw = _cache_().get(key);
    if (!raw) return null;
    if (raw.indexOf('CHUNK:') === 0) {
      var n = Number(raw.substring(6));
      var parts = [];
      var keys = [];
      for (var i = 0; i < n; i++) keys.push(key + ':' + i);
      var got = _cache_().getAll(keys);
      for (var j = 0; j < n; j++) {
        var c = got[key + ':' + j];
        if (c == null) return null;
        parts.push(c);
      }
      return JSON.parse(parts.join(''));
    }
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function _cachePut_(key, val, ttl) {
  try {
    var json = JSON.stringify(val);
    ttl = ttl || CACHE_TTL;
    if (json.length < 95000) {
      _cache_().put(key, json, ttl);
    } else {
      var n = Math.ceil(json.length / 90000);
      var map = {};
      map[key] = 'CHUNK:' + n;
      for (var i = 0; i < n; i++) map[key + ':' + i] = json.substring(i * 90000, (i + 1) * 90000);
      _cache_().putAll(map, ttl);
    }
  } catch (e) {}
}

/* ── Version counters (ScriptProperties) — อ่านทั้งก้อนครั้งเดียวต่อ request ── */
function _resetReq_() { __VERMEMO = null; }  // เรียกที่ต้น api()/doGet() ทุกครั้ง
function _ver_(scope) {
  if (!__VERMEMO) __VERMEMO = PropertiesService.getScriptProperties().getProperties() || {};
  return Number(__VERMEMO['ver:' + scope] || '1');
}
function _bumpVer_(scope) {
  if (__BATCH) { __BATCH_DIRTY[scope] = true; return; }  // batch: เลื่อนไป bump ครั้งเดียวตอนจบ
  var props = PropertiesService.getScriptProperties();
  var v = Number(props.getProperty('ver:' + scope) || '1') + 1;
  props.setProperty('ver:' + scope, String(v));
  if (__VERMEMO) __VERMEMO['ver:' + scope] = String(v); // ให้ read ถัดไปในคำขอเดียวเห็นเวอร์ชันใหม่
}

/* ── Batch Write Mode — สำหรับ seed/import จำนวนมาก ──────────────────
 *  เลื่อน SpreadsheetApp.flush() + รวม version bump ทุก sheet เป็น "ครั้งเดียว" ตอนจบ
 *  ลดคอขวด: flush ต่อ op (~50-100ms) + ScriptProperties.setProperty ต่อ bump (~100-300ms)
 *  จาก ~40 ครั้ง → flush 1 + setProperties 1 → seed เร็วขึ้น 5-10 เท่า (ไม่ timeout)
 *  ⚠️ ระหว่าง batch: DB_readAll คืน cache เดิม (ยังไม่เห็นข้อมูลใหม่) → ห้าม read-after-write
 *     ให้ใช้ค่าที่ DB_insert/Seed_user_ "return" แทนการ DB_readAll ซ้ำ */
function DB_beginBatch() { __BATCH = true; __BATCH_DIRTY = {}; }
function DB_endBatch() {
  if (!__BATCH) return;
  __BATCH = false;
  SpreadsheetApp.flush();                                   // flush ครั้งเดียว
  var scopes = Object.keys(__BATCH_DIRTY); __BATCH_DIRTY = {};
  if (scopes.length) {
    var props = PropertiesService.getScriptProperties();
    var cur = props.getProperties() || {};
    var toSet = {};
    scopes.forEach(function (s) { toSet['ver:' + s] = String(Number(cur['ver:' + s] || '1') + 1); });
    props.setProperties(toSet);                             // setProperties ครั้งเดียว (batch write)
    __VERMEMO = null;                                       // reset → _ver_ โหลดใหม่
    scopes.forEach(function (s) { delete __L1[s.replace('sheet:', '')]; }); // ล้าง L1 ของ sheet ที่เปลี่ยน
  }
}
function _flush_() { if (!__BATCH) SpreadsheetApp.flush(); }

/* ── Schema management ───────────────────────────────────────────── */
function DB_ensureSchema_(name) {
  var ss = cfg_ss_();
  var cols = SCHEMAS[name];
  if (!cols) throw new Error('ไม่พบ schema ของชีต: ' + name);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cols.length)
      .setFontWeight('bold').setBackground('#FBF5E3').setFontColor('#6B5B2E');
    sh.setColumnWidth(1, 170);
  } else {
    // ตรวจ header เผื่อมีการเพิ่มคอลัมน์ใหม่ภายหลัง
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    if (header.join('|') !== cols.join('|').substring(0, header.join('|').length) || lastCol < cols.length) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function DB_ensureAll() {
  Object.keys(SHEETS).forEach(function (k) { DB_ensureSchema_(SHEETS[k]); });
  return true;
}

/* ── Read-through cache: อ่านทั้งชีตเป็น array ของ object ─────────── */
function DB_readAll(name) {
  var ver = _ver_('sheet:' + name);
  var l1 = __L1[name];
  if (l1 && l1.ver === ver) return l1.data;          // L1 hit — เร็วสุด (ไม่ parse)
  var cacheKey = 'sheet:' + name + ':v' + ver;
  var cached = _cacheGet_(cacheKey);
  if (cached) { __L1[name] = { ver: ver, data: cached }; return cached; }

  var sh = DB_ensureSchema_(name);
  var cols = SCHEMAS[name];
  var last = sh.getLastRow();
  if (last < 2) { _cachePut_(cacheKey, []); __L1[name] = { ver: ver, data: [] }; return []; }

  var values = sh.getRange(2, 1, last - 1, cols.length).getValues();
  var keyCol = cols.indexOf('id'); if (keyCol < 0) keyCol = 0;
  var result = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    if (String(row[keyCol] == null ? '' : row[keyCol]).trim() === '') continue;
    var obj = {};
    for (var i = 0; i < cols.length; i++) {
      var v = row[i];
      if (v instanceof Date) v = cfg_iso_(v);
      obj[cols[i]] = (v == null) ? '' : v;
    }
    result.push(obj);
  }
  _cachePut_(cacheKey, result);
  __L1[name] = { ver: ver, data: result };
  return result;
}

// คอลัมน์ key ของชีต: ใช้ 'id' ถ้ามี ไม่งั้นใช้คอลัมน์แรก (Settings=key, Sessions=token)
function DB_keyField_(name) {
  var cols = SCHEMAS[name] || ['id'];
  return cols.indexOf('id') >= 0 ? 'id' : cols[0];
}

/* ── Index: key → object (O(1) lookup) — cached เช่นกัน ───────────── */
function DB_index(name, byField) {
  byField = byField || DB_keyField_(name);
  var rows = DB_readAll(name);
  var idx = {};
  for (var i = 0; i < rows.length; i++) idx[String(rows[i][byField])] = rows[i];
  return idx;
}

function DB_get(name, id) {
  return DB_index(name)[String(id)] || null;
}

function DB_findRowNumber_(sh, cols, id) {
  var keyCol = cols.indexOf('id'); if (keyCol < 0) keyCol = 0;
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, keyCol + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function _rowFromObj_(cols, obj) {
  return cols.map(function (c) { return obj[c] == null ? '' : obj[c]; });
}

/* ── CRUD ────────────────────────────────────────────────────────── */
function DB_insert(name, data) {
  var sh = DB_ensureSchema_(name);
  var cols = SCHEMAS[name];
  var now = cfg_now_();
  var obj = {};
  cols.forEach(function (c) { obj[c] = data[c] == null ? '' : data[c]; });
  if (cols.indexOf('id') >= 0 && !obj.id) obj.id = cfg_uid_((name.substring(0, 3) || 'ROW').toUpperCase());
  if (cols.indexOf('created_at') >= 0 && !obj.created_at) obj.created_at = now;
  if (cols.indexOf('updated_at') >= 0 && !obj.updated_at) obj.updated_at = now;
  sh.appendRow(_rowFromObj_(cols, obj));
  _flush_();
  _bumpVer_('sheet:' + name);
  return obj;
}

// Bulk insert — setValues() ครั้งเดียว (สำคัญมากที่ระดับพันแถว)
function DB_bulkInsert(name, list) {
  if (!list || !list.length) return 0;
  var sh = DB_ensureSchema_(name);
  var cols = SCHEMAS[name];
  var now = cfg_now_();
  var rows = list.map(function (data) {
    var obj = {};
    cols.forEach(function (c) { obj[c] = data[c] == null ? '' : data[c]; });
    if (cols.indexOf('id') >= 0 && !obj.id) obj.id = cfg_uid_((name.substring(0, 3) || 'ROW').toUpperCase());
    if (cols.indexOf('created_at') >= 0 && !obj.created_at) obj.created_at = now;
    if (cols.indexOf('updated_at') >= 0 && !obj.updated_at) obj.updated_at = now;
    return _rowFromObj_(cols, obj);
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
  _flush_();
  _bumpVer_('sheet:' + name);
  return rows.length;
}

function DB_update(name, id, patch) {
  var sh = DB_ensureSchema_(name);
  var cols = SCHEMAS[name];
  var rn = DB_findRowNumber_(sh, cols, id);
  if (rn < 0) return null;
  var current = sh.getRange(rn, 1, 1, cols.length).getValues()[0];
  var obj = {};
  for (var i = 0; i < cols.length; i++) {
    var v = current[i];
    if (v instanceof Date) v = cfg_iso_(v);
    obj[cols[i]] = (v == null) ? '' : v;
  }
  Object.keys(patch).forEach(function (k) { if (cols.indexOf(k) >= 0) obj[k] = patch[k]; });
  if (cols.indexOf('updated_at') >= 0) obj.updated_at = cfg_now_();
  sh.getRange(rn, 1, 1, cols.length).setValues([_rowFromObj_(cols, obj)]);
  _flush_();
  _bumpVer_('sheet:' + name);
  return obj;
}

// Soft delete (status = deleted) — ป้องกันข้อมูลหาย
function DB_softDelete(name, id) {
  return DB_update(name, id, { status: 'deleted' });
}

// Hard delete (เฉพาะ sessions / cleanup)
function DB_delete(name, id) {
  var sh = DB_ensureSchema_(name);
  var cols = SCHEMAS[name];
  var keyCol = cols.indexOf('id');
  var rn = DB_findRowNumber_(sh, cols, id);
  if (rn < 0) {
    // sessions ใช้ token เป็น key
    keyCol = 0;
    var last = sh.getLastRow();
    if (last >= 2) {
      var keys = sh.getRange(2, keyCol + 1, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]) === String(id)) { rn = i + 2; break; }
      }
    }
  }
  if (rn < 0) return false;
  sh.deleteRow(rn);
  _flush_();
  _bumpVer_('sheet:' + name);
  return true;
}

/* ── Query helpers (filter/paginate ที่ server) ──────────────────── */
function DB_query(name, opts) {
  opts = opts || {};
  var rows = DB_readAll(name);
  if (opts.where) rows = rows.filter(opts.where);
  if (opts.notDeleted !== false) rows = rows.filter(function (r) { return r.status !== 'deleted'; });
  if (opts.sort) rows.sort(opts.sort);
  var total = rows.length;
  if (opts.page) {
    var size = opts.size || 50;
    var start = (opts.page - 1) * size;
    rows = rows.slice(start, start + size);
  }
  return { items: rows, total: total };
}

/* ── Settings helpers ────────────────────────────────────────────── */
function Settings_get(key, fallback) {
  var row = DB_get(SHEETS.SETTINGS, key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch (e) { return row.value; }
}
function Settings_set(key, value) {
  var v = (typeof value === 'object') ? JSON.stringify(value) : String(value);
  var existing = DB_get(SHEETS.SETTINGS, key);
  if (existing) return DB_update(SHEETS.SETTINGS, key, { value: v, updated_at: cfg_now_() });
  return DB_insert(SHEETS.SETTINGS, { key: key, value: v, updated_at: cfg_now_() });
}
function Settings_public_() {
  return {
    school_name:  Settings_get('school_name', APP.ORG),
    school_motto: Settings_get('school_motto', APP.MOTTO),
    academic_year: Settings_get('academic_year', cfg_academicYear_()),
    logo_url:     Settings_get('logo_url', '')
  };
}
