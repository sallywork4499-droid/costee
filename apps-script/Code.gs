/**
 * Costee – backend Google Apps Script.
 * Gắn vào Google Sheet chi tiêu của bạn. Dữ liệu app được lưu trong 2 tab mới:
 *   - "Costee_GiaoDich": mỗi dòng là 1 khoản chi / khoản "để dành"
 *   - "Costee_CaiDat"  : cài đặt (ngân sách, hạn mức, danh mục) dạng JSON
 * Tab cũ "1. Chi tiêu" KHÔNG bị sửa – chỉ được đọc khi nhập dữ liệu cũ.
 *
 * Cách cài: xem README.md (mục "Kết nối Google Sheet").
 */

var TX_SHEET = 'Costee_GiaoDich';
var SET_SHEET = 'Costee_CaiDat';
var LEGACY_SHEET = '1. Chi tiêu';
var TX_HEADERS = ['ID', 'Ngày', 'Số tiền', 'Hạng mục', 'Ghi chú', 'Loại', 'Tạo lúc', 'Sửa lúc'];
var TYPE_LABEL = { expense: 'Chi', saved: 'Để dành' };
var SAVED_LABELS = ['Để dành', 'Nhịn được', 'saved']; // nhận cả nhãn cũ

/* ---------------- Menu trong Google Sheet ---------------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Costee')
    .addItem('1. Khởi tạo & lấy mã bí mật', 'setup')
    .addItem('2. Nhập dữ liệu cũ từ tab "1. Chi tiêu"', 'importLegacyFromMenu')
    .addItem('Xem lại mã bí mật', 'showToken')
    .addItem('Đổi mã bí mật mới', 'resetToken')
    .addToUi();
}

function setup() {
  ensureSheets_();
  var token = getToken_() || newToken_();
  SpreadsheetApp.getUi().alert(
    'Costee đã sẵn sàng',
    'Mã bí mật của bạn:\n\n' + token +
    '\n\nBước tiếp theo: Triển khai (Deploy) → Tùy chọn triển khai mới → Ứng dụng web, ' +
    'rồi dán URL ứng dụng web + mã này vào phần Cài đặt của app.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function showToken() {
  SpreadsheetApp.getUi().alert('Mã bí mật Costee', getToken_() || 'Chưa có – hãy chạy "Khởi tạo".', SpreadsheetApp.getUi().ButtonSet.OK);
}

function resetToken() {
  var t = newToken_();
  SpreadsheetApp.getUi().alert('Mã bí mật mới', t + '\n\nNhớ cập nhật mã này trong app trên mọi thiết bị.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function importLegacyFromMenu() {
  var r = importLegacy_(false);
  SpreadsheetApp.getUi().alert('Nhập dữ liệu cũ', r.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------------- Web API ---------------- */

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { /* ignore */ }
  return handle_(body);
}

function handle_(req) {
  try {
    var token = getToken_();
    if (!token) throw new Error('Chưa khởi tạo. Mở Google Sheet → menu Costee → Khởi tạo.');
    if (String(req.token || '') !== token) throw new Error('Sai mã bí mật.');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      ensureSheets_();
      switch (req.action) {
        case 'ping':
          return json_({ ok: true, name: SpreadsheetApp.getActive().getName() });
        case 'list':
          return json_({ ok: true, tx: readTx_(), settings: readSettings_() });
        case 'sync': {
          var results = applyOps_(req.ops || []);
          return json_({ ok: true, results: results, tx: readTx_(), settings: readSettings_() });
        }
        case 'importLegacy': {
          var r = importLegacy_(!!req.replace);
          return json_({ ok: true, message: r.message, imported: r.imported, tx: readTx_(), settings: readSettings_() });
        }
        default:
          throw new Error('Hành động không hợp lệ: ' + req.action);
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Token ---------------- */

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN');
}

function newToken_() {
  var t = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  PropertiesService.getScriptProperties().setProperty('TOKEN', t);
  return t;
}

/* ---------------- Sheets ---------------- */

function ensureSheets_() {
  var ss = SpreadsheetApp.getActive();
  var tx = ss.getSheetByName(TX_SHEET);
  if (!tx) {
    tx = ss.insertSheet(TX_SHEET);
    tx.getRange(1, 1, 1, TX_HEADERS.length).setValues([TX_HEADERS]).setFontWeight('bold');
    tx.setFrozenRows(1);
    tx.getRange('B:B').setNumberFormat('dd/MM/yyyy');
    tx.getRange('C:C').setNumberFormat('#,##0');
    tx.getRange('G:H').setNumberFormat('dd/MM/yyyy HH:mm');
  }
  var st = ss.getSheetByName(SET_SHEET);
  if (!st) {
    st = ss.insertSheet(SET_SHEET);
    st.getRange(1, 1, 1, 2).setValues([['Khoá', 'Giá trị (JSON)']]).setFontWeight('bold');
  }
  return { tx: tx, st: st };
}

function tz_() {
  return Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
}

function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  var s = String(v || '');
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[0];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  return '';
}

function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

function toDate_(ymd) {
  var p = String(ymd).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}

function readTx_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(TX_SHEET);
  var n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  var rows = sh.getRange(2, 1, n, TX_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0] && !r[2]) continue;
    out.push({
      id: String(r[0] || ('row' + (i + 2))),
      date: fmtDate_(r[1]),
      amount: Number(r[2]) || 0,
      category: String(r[3] || 'Khác'),
      note: String(r[4] || ''),
      type: SAVED_LABELS.indexOf(String(r[5])) >= 0 ? 'saved' : 'expense',
      createdAt: r[6] instanceof Date ? r[6].getTime() : Number(r[6]) || 0,
      updatedAt: r[7] instanceof Date ? r[7].getTime() : Number(r[7]) || 0
    });
  }
  return out;
}

function txToRow_(t) {
  return [
    t.id,
    toDate_(t.date),
    Number(t.amount) || 0,
    t.category || 'Khác',
    t.note || '',
    TYPE_LABEL[t.type] || TYPE_LABEL.expense,
    new Date(Number(t.createdAt) || Date.now()),
    new Date(Number(t.updatedAt) || Date.now())
  ];
}

function findRow_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n <= 0) return -1;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function applyOps_(ops) {
  var sh = SpreadsheetApp.getActive().getSheetByName(TX_SHEET);
  var results = [];
  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
    try {
      if (op.op === 'upsert') {
        var t = op.tx;
        if (!t || !t.id || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error('Dữ liệu không hợp lệ');
        var row = findRow_(sh, t.id);
        if (row > 0) sh.getRange(row, 1, 1, TX_HEADERS.length).setValues([txToRow_(t)]);
        else sh.appendRow(txToRow_(t));
      } else if (op.op === 'delete') {
        var r = findRow_(sh, op.id);
        if (r > 0) sh.deleteRow(r);
      } else if (op.op === 'settings') {
        writeSettings_(op.settings);
      }
      results.push({ ok: true });
    } catch (err) {
      results.push({ ok: false, error: String(err.message || err) });
    }
  }
  return results;
}

function readSettings_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SET_SHEET);
  var n = sh.getLastRow() - 1;
  if (n <= 0) return null;
  var rows = sh.getRange(2, 1, n, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === 'settings') {
      try { return JSON.parse(rows[i][1]); } catch (e) { return null; }
    }
  }
  return null;
}

function writeSettings_(settings) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SET_SHEET);
  var json = JSON.stringify(settings || {});
  var n = sh.getLastRow() - 1;
  if (n > 0) {
    var keys = sh.getRange(2, 1, n, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === 'settings') { sh.getRange(i + 2, 2).setValue(json); return; }
    }
  }
  sh.appendRow(['settings', json]);
}

/* ---------------- Nhập dữ liệu cũ ---------------- */

/**
 * Đọc tab "1. Chi tiêu" (Ngày | Nội dung | Hạng mục | Số tiền | cột E "đã tiết kiệm" | cột F ghi chú)
 * và chép sang tab Costee_GiaoDich. Có thể chạy lại nhiều lần: dòng nào đã nhập (theo ID "old-<số dòng>")
 * sẽ được bỏ qua.
 */
function importLegacy_(replace) {
  var ss = SpreadsheetApp.getActive();
  var legacy = ss.getSheetByName(LEGACY_SHEET);
  if (!legacy) return { imported: 0, message: 'Không tìm thấy tab "' + LEGACY_SHEET + '".' };
  var n = legacy.getLastRow();
  if (n < 2) return { imported: 0, message: 'Tab cũ không có dữ liệu.' };
  var values = legacy.getRange(1, 1, n, 6).getValues();
  var formulas = legacy.getRange(1, 1, n, 6).getFormulas();
  var parsed = parseLegacy(values, formulas, fmtDate_);

  var sh = ensureSheets_().tx;
  if (replace) {
    var all = readTx_().filter(function (t) { return t.id.indexOf('old-') === 0; });
    for (var k = all.length - 1; k >= 0; k--) { var row = findRow_(sh, all[k].id); if (row > 0) sh.deleteRow(row); }
  }
  var existing = {};
  readTx_().forEach(function (t) { existing[t.id] = true; });
  var now = Date.now();
  var rows = parsed.tx.filter(function (t) { return !existing[t.id]; }).map(function (t) {
    t.createdAt = now; t.updatedAt = now; return txToRow_(t);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, TX_HEADERS.length).setValues(rows);
  var msg = 'Đã nhập ' + rows.length + ' dòng mới (' + parsed.stats.expense + ' khoản chi, ' +
    parsed.stats.saved + ' khoản để dành trong sheet cũ).';
  if (parsed.stats.undated) msg += ' ' + parsed.stats.undated + ' dòng không ghi ngày đã lấy theo ngày của dòng phía trên.';
  return { imported: rows.length, message: msg };
}

/**
 * Hàm thuần (không gọi API Google) để có thể test bằng Node.
 * values/formulas: mảng 2 chiều 6 cột A..F, dòng 0 là tiêu đề.
 */
function parseLegacy(values, formulas, dateFmt) {
  var tx = [];
  var stats = { expense: 0, saved: 0, undated: 0, skipped: 0 };
  var savedStart = -1;
  for (var i = 0; i < values.length; i++) {
    if (typeof values[i][4] === 'string' && /tiết kiệm/i.test(values[i][4])) { savedStart = i; break; }
  }
  var lastDate = '';
  for (var r = 1; r < values.length; r++) {
    var v = values[r];
    var f = formulas[r] || [];
    var date = dateFmt(v[0]);
    var category = cleanCategory(v[2]);
    var note = String(v[1] == null ? '' : v[1]).trim();
    var amount = typeof v[3] === 'number' ? v[3] : Number(String(v[3] || '').replace(/[^\d.-]/g, '')) || 0;
    // Cột E: chỉ lấy giá trị nhập tay (không phải công thức) ở vùng "Đã tiết kiệm không mua linh tinh".
    var savedAmt = savedStart >= 0 && r > savedStart + 1 && typeof v[4] === 'number' && !f[4] ? v[4] : 0;
    var savedNote = String(v[5] == null || typeof v[5] === 'number' ? '' : v[5]).trim();
    if (!amount && !savedAmt) { if (v[1] || v[2]) stats.skipped++; continue; }
    var undated = false;
    if (!date) { date = lastDate; undated = true; }
    if (!date) { stats.skipped++; continue; }
    lastDate = date;
    if (amount > 0) {
      tx.push({ id: 'old-' + (r + 1), date: date, amount: amount, category: category, type: 'expense',
        note: note + (undated ? (note ? ' ' : '') + '(sheet cũ không ghi ngày)' : '') });
      stats.expense++;
      if (undated) stats.undated++;
    }
    if (savedAmt > 0) {
      tx.push({ id: 'old-' + (r + 1) + 's', date: date, amount: savedAmt, category: category, type: 'saved',
        note: [note, savedNote].filter(String).join(' – ') });
      stats.saved++;
    }
  }
  return { tx: tx, stats: stats };
}

/** "1. Tiền ăn" → "Tiền ăn"; rỗng → "Khác" */
function cleanCategory(c) {
  var s = String(c == null ? '' : c).replace(/^\s*\d+\s*[.)-]\s*/, '').trim();
  return s || 'Khác';
}

if (typeof module !== 'undefined') module.exports = { parseLegacy: parseLegacy, cleanCategory: cleanCategory };
