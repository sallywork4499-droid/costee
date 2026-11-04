/* Costee – sổ chi tiêu cá nhân. Không cần build: HTML + CSS + JS thuần. */
(function () {
  'use strict';

  /* ================= Helpers ================= */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('costee.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('costee.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function today() { return ymd(new Date()); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  var DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var DOW_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  var nf = new Intl.NumberFormat('vi-VN');
  function money(n) { return nf.format(Math.round(n || 0)) + '₫'; }
  function compact(n) {
    var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e9) return s + trim(a / 1e9) + ' tỷ';
    if (a >= 1e6) return s + trim(a / 1e6) + 'tr';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'k';
    return s + Math.round(a);
  }
  function trim(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  /** "45" → 45.000 ; "45k" → 45.000 ; "1.2tr" / "1,2tr" / "1tr2" → 1.200.000 ; "150.000" → 150.000 */
  function parseAmount(raw) {
    var s = String(raw || '').toLowerCase().replace(/\s|₫|đ|vnd/g, '');
    if (!s) return 0;
    var m = s.match(/^(\d+)(tr|m|triệu)(\d{1,3})$/);
    if (m) return +m[1] * 1e6 + +(m[3] + '00').slice(0, 3) * 1e3;
    m = s.match(/^([\d.,]+)(k|n|nghìn|ngàn|tr|m|triệu|tỷ|ty|b)?$/);
    if (!m) return 0;
    var numStr = m[1], unit = m[2] || '';
    var num;
    if (unit) {
      num = parseFloat(numStr.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    } else if (/^\d{1,3}([.,]\d{3})+$/.test(numStr)) {
      num = +numStr.replace(/[.,]/g, '');
    } else {
      num = parseFloat(numStr.replace(',', '.'));
    }
    if (!isFinite(num)) return 0;
    if (/^(k|n|nghìn|ngàn)$/.test(unit)) return Math.round(num * 1e3);
    if (/^(tr|m|triệu)$/.test(unit)) return Math.round(num * 1e6);
    if (/^(tỷ|ty|b)$/.test(unit)) return Math.round(num * 1e9);
    // Không có đơn vị: số nhỏ hơn 1000 hiểu là nghìn đồng (gõ 45 = 45.000₫)
    return num < 1000 ? Math.round(num * 1e3) : Math.round(num);
  }

  /* ================= Mascot: bé Capy ================= */
  /** Mascot bé Capy. mood: happy | ok | worried | shocked | sleepy | proud */
  function mascot(mood, cls) {
    var ink = '#4b3a2c', fur = '#c99a6e', head = '#d4a87c', shade = '#b8875c', snout = '#e2c19c', ear = '#a97a52', nose = '#5e4332';
    var cheek = '#f1a995', heart = '#ef9f8a', coin = '#e2b65a', yuzu = '#f0a94e', leaf = '#7f9f6a';
    var sw = 'stroke="' + ink + '" stroke-linecap="round" stroke-linejoin="round"';
    var s = '<svg class="' + (cls || '') + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false">';
    s += '<ellipse cx="60" cy="113" rx="32" ry="3.5" fill="rgba(75,58,44,.13)"/>';
    // thân
    s += '<path d="M28 93 C28 76 41 68 60 68 C79 68 92 76 92 93 C92 106 80 111 60 111 C40 111 28 106 28 93Z" fill="' + fur + '" ' + sw + ' stroke-width="2.4"/>';
    s += '<path d="M80 74 C88 80 91 90 89 99 C87 105 81 108 74 109 C82 103 85 94 83 85 C82 80 81 77 80 74Z" fill="' + shade + '" opacity=".55"/>';
    s += '<ellipse cx="47" cy="110" rx="8" ry="3.8" fill="' + head + '" ' + sw + ' stroke-width="2"/><ellipse cx="73" cy="110" rx="8" ry="3.8" fill="' + head + '" ' + sw + ' stroke-width="2"/>';
    // tai
    s += '<ellipse cx="37" cy="36" rx="5" ry="4" fill="' + ear + '" ' + sw + ' stroke-width="2"/><ellipse cx="83" cy="36" rx="5" ry="4" fill="' + ear + '" ' + sw + ' stroke-width="2"/>';
    // đầu (hơi vuông, đặc trưng capybara)
    s += '<path d="M31 50 C31 38 40 33 60 33 C80 33 89 38 89 50 L90 62 C90 74 79 80 60 80 C41 80 30 74 30 62Z" fill="' + head + '" ' + sw + ' stroke-width="2.4"/>';
    // quả quýt trên đầu
    s += '<circle cx="60" cy="27" r="7.5" fill="' + yuzu + '" ' + sw + ' stroke-width="2"/><path d="M60 20 C62 15 67 14 70 16 C68 20 64 21 60 20Z" fill="' + leaf + '" ' + sw + ' stroke-width="1.6"/><circle cx="57.5" cy="25" r="1.6" fill="#fff" opacity=".7"/>';
    // mõm
    s += '<path d="M40 60 C40 54 48 52 60 52 C72 52 80 54 80 60 C80 70 72 76 60 76 C48 76 40 70 40 60Z" fill="' + snout + '"/>';
    s += '<path d="M51 56 C51 53.5 55 53 60 53 C65 53 69 53.5 69 56 C69 59 65 60.5 60 60.5 C55 60.5 51 59 51 56Z" fill="' + nose + '"/>';
    s += '<ellipse cx="36" cy="60" rx="4.5" ry="2.8" fill="' + cheek + '" opacity=".8"/><ellipse cx="84" cy="60" rx="4.5" ry="2.8" fill="' + cheek + '" opacity=".8"/>';
    // mắt
    var g = '<g fill="none" ' + sw + ' stroke-width="2.4">';
    if (mood === 'happy' || mood === 'proud') s += g + '<path d="M38 47 Q42 43 46 47"/><path d="M74 47 Q78 43 82 47"/></g>';
    else if (mood === 'sleepy') s += g + '<path d="M38 47 Q42 50 46 47"/><path d="M74 47 Q78 50 82 47"/></g>';
    else if (mood === 'shocked') s += '<circle cx="42" cy="46" r="4" fill="#fff" ' + sw + ' stroke-width="2"/><circle cx="78" cy="46" r="4" fill="#fff" ' + sw + ' stroke-width="2"/><circle cx="42" cy="46.5" r="1.8" fill="' + ink + '"/><circle cx="78" cy="46.5" r="1.8" fill="' + ink + '"/>';
    else {
      s += '<circle cx="42" cy="46" r="2.6" fill="' + ink + '"/><circle cx="78" cy="46" r="2.6" fill="' + ink + '"/><circle cx="42.9" cy="45.1" r=".8" fill="#fff"/><circle cx="78.9" cy="45.1" r=".8" fill="#fff"/>';
      if (mood === 'worried') s += g.replace('2.4', '2') + '<path d="M36 39 L46 41"/><path d="M84 39 L74 41"/></g>';
    }
    // miệng
    if (mood === 'shocked') s += '<ellipse cx="60" cy="69" rx="2.6" ry="3.2" fill="' + ink + '"/>';
    else if (mood === 'worried') s += '<path d="M55 69 Q57.5 67 60 69 Q62.5 71 65 69" fill="none" ' + sw + ' stroke-width="1.8"/>';
    else if (mood === 'sleepy') s += '<ellipse cx="60" cy="68" rx="1.8" ry="1.5" fill="' + ink + '"/>';
    else s += '<path d="M60 60.5 V65 M55 65 Q57.5 68.5 60 65 Q62.5 68.5 65 65" fill="none" ' + sw + ' stroke-width="1.8"/>';
    // tay + đồ ôm
    if (mood === 'sleepy') {
      s += '<g fill="none" ' + sw + ' stroke-width="2.2"><path d="M40 90 Q48 96 56 93"/><path d="M80 90 Q72 96 64 93"/></g>';
      s += '<text x="88" y="26" font-family="Caveat, cursive" font-size="16" font-weight="700" fill="' + ink + '">z</text><text x="98" y="16" font-family="Caveat, cursive" font-size="12" font-weight="700" fill="' + ink + '">z</text>';
    } else if (mood === 'proud' || mood === 'worried' || mood === 'shocked') {
      s += '<circle cx="60" cy="92" r="10" fill="' + coin + '" ' + sw + ' stroke-width="2"/><circle cx="60" cy="92" r="6.3" fill="none" ' + sw + ' stroke-width="1.3"/>';
      s += '<ellipse cx="49" cy="93" rx="5" ry="4" fill="' + head + '" ' + sw + ' stroke-width="2"/><ellipse cx="71" cy="93" rx="5" ry="4" fill="' + head + '" ' + sw + ' stroke-width="2"/>';
    } else {
      s += '<path d="M60 101 C50 95 46 90.5 48 86.5 C50 83 55.5 83 60 88 C64.5 83 70 83 72 86.5 C74 90.5 70 95 60 101Z" fill="' + heart + '" ' + sw + ' stroke-width="2"/>';
      s += '<ellipse cx="48" cy="92" rx="5" ry="4" fill="' + head + '" ' + sw + ' stroke-width="2"/><ellipse cx="72" cy="92" rx="5" ry="4" fill="' + head + '" ' + sw + ' stroke-width="2"/>';
    }
    if (mood === 'worried') s += '<path d="M94 36 Q99 43 97 46 Q93 48 92 43 Q92 40 94 36Z" fill="#a9d3ea" ' + sw + ' stroke-width="1.5"/>';
    if (mood === 'shocked') s += '<g ' + sw + ' stroke-width="2"><path d="M22 36 L27 42"/><path d="M98 36 L93 42"/></g>';
    return s + '</svg>';
  }

  /* ================= Default data ================= */
  var DEFAULT_CATEGORIES = [
    { name: 'Tiền ăn', icon: '🍜' }, { name: 'Coffee', icon: '☕' }, { name: 'Quần áo', icon: '👗' },
    { name: 'Skincare/Mỹ phẩm', icon: '💄' }, { name: 'Học thêm/Khoá học', icon: '📚' }, { name: 'Phòng trọ', icon: '🏠' },
    { name: 'Mua quà', icon: '🎁' }, { name: 'Nuôi xe', icon: '🛵' }, { name: 'Mời ae/mọi người', icon: '🍻' },
    { name: 'Trải nghiệm/Du lịch', icon: '✈️' }, { name: 'Sức khoẻ', icon: '💊' }, { name: 'Gửi về nhà', icon: '👨‍👩‍👧' },
    { name: 'Thiết bị học tập/làm việc', icon: '💻' }, { name: 'Sports', icon: '🏸' }, { name: 'Tài khoản AI', icon: '🤖' },
    { name: 'Đầu tư', icon: '📈' }, { name: 'Chi tiêu Lễ Tết', icon: '🧧' }, { name: 'Khác', icon: '📦' }
  ];
  var DEFAULT_SETTINGS = {
    monthlyBudget: 9000000,
    categories: DEFAULT_CATEGORIES,
    budgets: [
      { id: 'b1', name: 'Ăn uống', limit: 2500000, cats: ['Tiền ăn'] },
      { id: 'b2', name: 'Coffee học bài', limit: 700000, cats: ['Coffee'] },
      { id: 'b3', name: 'Học', limit: 1000000, cats: ['Học thêm/Khoá học', 'Thiết bị học tập/làm việc'] },
      { id: 'b4', name: 'Sports', limit: 500000, cats: ['Sports'] },
      { id: 'b5', name: 'Trải nghiệm', limit: 500000, cats: ['Trải nghiệm/Du lịch'] },
      { id: 'b6', name: 'Quần áo & mỹ phẩm', limit: 500000, cats: ['Quần áo', 'Skincare/Mỹ phẩm'] },
      { id: 'b7', name: 'Phòng trọ', limit: 3200000, cats: ['Phòng trọ'] }
    ],
    // Hạng mục không tính vào "chi tiêu sinh hoạt" khi tính tiền được chi mỗi ngày
    excludeFromDaily: ['Phòng trọ', 'Đầu tư', 'Gửi về nhà'],
    updatedAt: 0
  };

  /* ================= State ================= */
  var state = {
    tx: store.get('tx', []),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {})),
    queue: store.get('queue', []),
    conn: store.get('conn', { url: '', token: '' }),
    lastSync: store.get('lastSync', 0),
    syncError: '',
    syncing: false,
    view: store.get('view', 'today'),
    report: { period: 'month', offset: 0 },
    hist: { q: '', cat: '', type: '', limit: 40 },
    editing: null
  };

  function save() {
    store.set('tx', state.tx);
    store.set('settings', state.settings);
    store.set('queue', state.queue);
    store.set('lastSync', state.lastSync);
  }

  function catTint(name) {
    var i = state.settings.categories.findIndex(function (c) { return c.name === name; });
    return 'tint-' + ((i < 0 ? name.length : i) % 4);
  }
  function catIcon(name) {
    var c = state.settings.categories.filter(function (x) { return x.name === name; })[0];
    return c ? c.icon : '📦';
  }

  /* ================= Data mutations (offline-first) ================= */
  function applyOp(list, op) {
    if (op.op === 'upsert') {
      var i = list.findIndex(function (t) { return t.id === op.tx.id; });
      if (i >= 0) list[i] = op.tx; else list.push(op.tx);
    } else if (op.op === 'delete') {
      return list.filter(function (t) { return t.id !== op.id; });
    }
    return list;
  }
  function commit(op) {
    if (op.op === 'settings') state.settings = op.settings;
    else state.tx = applyOp(state.tx, op);
    if (state.conn.url) {
      // gộp các thao tác trùng id để hàng đợi gọn
      if (op.op !== 'settings') state.queue = state.queue.filter(function (q) { return (q.tx ? q.tx.id : q.id) !== (op.tx ? op.tx.id : op.id) || q.op === 'settings'; });
      else state.queue = state.queue.filter(function (q) { return q.op !== 'settings'; });
      state.queue.push(op);
    }
    save();
    render();
    scheduleSync();
  }
  function upsertTx(t) { t.updatedAt = Date.now(); if (!t.createdAt) t.createdAt = t.updatedAt; commit({ op: 'upsert', tx: t }); }
  function deleteTx(id) { commit({ op: 'delete', id: id }); }
  function saveSettings(s) { s.updatedAt = Date.now(); commit({ op: 'settings', settings: s }); }

  /* ================= Sync with Google Apps Script ================= */
  function api(body, conn) {
    conn = conn || state.conn;
    var payload = Object.assign({}, body, { token: conn.token });
    // text/plain để tránh preflight CORS với Apps Script
    return fetch(conn.url, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow' })
      .then(function (r) {
        if (!r.ok) throw new Error('Lỗi mạng ' + r.status);
        return r.text();
      })
      .then(function (txt) {
        var j;
        try { j = JSON.parse(txt); } catch (e) { throw new Error('Phản hồi không hợp lệ – kiểm tra lại URL ứng dụng web và quyền truy cập "Bất kỳ ai".'); }
        if (!j.ok) throw new Error(j.error || 'Lỗi không rõ');
        return j;
      });
  }

  var syncTimer = null;
  function scheduleSync(delay) {
    if (!state.conn.url) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay == null ? 600 : delay);
  }

  function sync() {
    if (!state.conn.url || state.syncing) return Promise.resolve();
    if (!navigator.onLine) { state.offline = true; state.syncError = 'Không có mạng – sẽ tự gửi khi có mạng'; renderSync(); return Promise.resolve(); }
    state.syncing = true; state.syncError = ''; state.offline = false; renderSync();
    var ops = state.queue.slice();
    return api({ action: 'sync', ops: ops })
      .then(function (j) {
        var failed = (j.results || []).filter(function (r) { return !r.ok; });
        state.queue = state.queue.slice(ops.length);
        var tx = j.tx || [];
        state.queue.forEach(function (op) { if (op.op !== 'settings') tx = applyOp(tx, op); });
        state.tx = tx;
        var hasPendingSettings = state.queue.some(function (q) { return q.op === 'settings'; });
        if (j.settings && !hasPendingSettings) {
          state.settings = Object.assign({}, DEFAULT_SETTINGS, j.settings);
        } else if (!j.settings && !hasPendingSettings) {
          // Sheet chưa có cài đặt → đẩy cài đặt trên máy lên
          state.queue.push({ op: 'settings', settings: state.settings });
          scheduleSync(100);
        }
        state.lastSync = Date.now();
        if (failed.length) state.syncError = failed.length + ' thao tác bị lỗi: ' + failed[0].error;
      })
      .catch(function (e) {
        // Lỗi mạng (offline, mất sóng) → không coi là lỗi, giữ hàng đợi để gửi sau
        state.syncError = e instanceof TypeError ? 'Không có mạng – sẽ tự gửi khi có mạng' : e.message;
        state.offline = e instanceof TypeError;
      })
      .then(function () { state.syncing = false; save(); render(); });
  }

  function renderSync() {
    var dot = $('#syncDot'), txt = $('#syncText');
    dot.className = 'dot';
    if (!state.conn.url) { txt.textContent = 'Trên máy'; return; }
    if (state.syncing) { dot.classList.add('busy'); txt.textContent = 'Đang đồng bộ'; return; }
    if (state.offline) { dot.classList.add('pending'); txt.textContent = 'Offline' + (state.queue.length ? ' · ' + state.queue.length + ' chờ gửi' : ''); return; }
    if (state.syncError) { dot.classList.add('err'); txt.textContent = 'Lỗi đồng bộ'; return; }
    if (state.queue.length) { dot.classList.add('pending'); txt.textContent = state.queue.length + ' chờ gửi'; return; }
    dot.classList.add('ok'); txt.textContent = 'Đã đồng bộ';
  }

  /* ================= Calculations ================= */
  function expenses(from, to) { // from/to: 'yyyy-mm-dd' inclusive
    return state.tx.filter(function (t) { return t.type !== 'saved' && t.date >= from && t.date <= to; });
  }
  function savedIn(from, to) {
    return state.tx.filter(function (t) { return t.type === 'saved' && t.date >= from && t.date <= to; });
  }
  function sum(list) { return list.reduce(function (a, t) { return a + (+t.amount || 0); }, 0); }
  function monthRange(y, m) { return [ymd(new Date(y, m, 1)), ymd(new Date(y, m, daysInMonth(y, m)))]; }
  function byCategory(list) {
    var map = {};
    list.forEach(function (t) { map[t.category] = (map[t.category] || 0) + (+t.amount || 0); });
    return Object.keys(map).map(function (k) { return { name: k, total: map[k] }; }).sort(function (a, b) { return b.total - a.total; });
  }
  function budgetStatus(spent, limit) {
    if (!limit) return 'ok';
    var r = spent / limit;
    return r > 1 ? 'over' : r >= 0.85 ? 'warn' : 'ok';
  }
  function statusLabel(st) { return st === 'over' ? '✕ Vượt' : st === 'warn' ? '⚠ Sắp hết' : '✓ Ổn'; }

  /** Tình hình tháng hiện tại + tiền có thể chi mỗi ngày (giống công thức "Còn lại / số ngày" trong sheet cũ). */
  function monthSnapshot() {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth();
    var r = monthRange(y, m), t = today();
    var dim = daysInMonth(y, m), day = now.getDate();
    var monthTx = expenses(r[0], r[1]);
    var spent = sum(monthTx);
    var exclude = state.settings.excludeFromDaily || [];
    var isDaily = function (x) { return exclude.indexOf(x.category) < 0; };
    var budget = +state.settings.monthlyBudget || 0;
    var spentBeforeToday = sum(monthTx.filter(function (x) { return x.date < t; }));
    var todayTx = monthTx.filter(function (x) { return x.date === t; });
    var spentToday = sum(todayTx);
    var dailyToday = sum(todayTx.filter(isDaily));
    // Ngân sách sinh hoạt hằng ngày = ngân sách tháng trừ các khoản cố định đã có (phòng trọ...) hoặc hạn mức của chúng
    var fixedLimit = 0;
    (state.settings.budgets || []).forEach(function (b) {
      var allFixed = b.cats.length && b.cats.every(function (c) { return exclude.indexOf(c) >= 0; });
      if (allFixed) fixedLimit += +b.limit || 0;
    });
    var fixedSpent = sum(monthTx.filter(function (x) { return !isDaily(x); }));
    var fixedReserve = Math.max(fixedLimit, fixedSpent);
    var dailyBefore = sum(monthTx.filter(function (x) { return x.date < t && isDaily(x); }));
    var daysLeft = dim - day + 1;
    var allowance = budget ? Math.max(0, (budget - fixedReserve - dailyBefore) / daysLeft) : 0;
    // Dự báo cuối tháng: chỉ ngoại suy các khoản sinh hoạt nhỏ (≤ 1tr); khoản lớn một lần cộng nguyên
    var dailyAll = monthTx.filter(isDaily);
    var oneOff = sum(dailyAll.filter(function (x) { return x.amount > 1000000; }));
    var routine = sum(dailyAll.filter(function (x) { return x.amount <= 1000000; }));
    var projected = fixedReserve + oneOff + (day > 0 ? routine / day * dim : 0);
    return {
      y: y, m: m, from: r[0], to: r[1], dim: dim, day: day, daysLeft: daysLeft,
      dailyBase: budget ? Math.max(0, (budget - fixedReserve) / dim) : 0, isDaily: isDaily,
      spent: spent, budget: budget, spentToday: spentToday, dailyToday: dailyToday, todayTx: todayTx,
      spentBeforeToday: spentBeforeToday, allowance: allowance, projected: projected,
      remaining: budget - spent, monthTx: monthTx, saved: sum(savedIn(r[0], r[1]))
    };
  }

  function budgetRows(list) {
    return (state.settings.budgets || []).map(function (b) {
      var spent = sum(list.filter(function (t) { return b.cats.indexOf(t.category) >= 0; }));
      return { b: b, spent: spent, st: budgetStatus(spent, +b.limit) };
    });
  }

  /* ================= Rendering ================= */
  function render() {
    renderSync();
    var now = new Date();
    $('#todayLabel').textContent = DOW_LONG[now.getDay()] + ', ' + pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
    $('.app').classList.toggle('wide', state.view === 'report');
    $$('.tabbar [data-view]').forEach(function (b) { b.classList.toggle('active', b.dataset.view === state.view); });
    var html = ({ today: viewToday, report: viewReport, history: viewHistory, settings: viewSettings })[state.view]();
    var v = $('#view');
    var keepFocus = document.activeElement && document.activeElement.id && v.contains(document.activeElement) ? document.activeElement.id : null;
    var selStart = keepFocus && document.activeElement.selectionStart;
    v.innerHTML = html;
    if (keepFocus && $('#' + keepFocus)) {
      var el = $('#' + keepFocus); el.focus();
      try { if (selStart != null) el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ }
    }
  }

  function txItem(t, showDate) {
    var d = parseYmd(t.date);
    var sub = (showDate ? DOW[d.getDay()] + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' · ' : '') + esc(t.category);
    return '<li><button type="button" class="tx" data-edit="' + esc(t.id) + '">' +
      '<span class="ic ' + catTint(t.category) + '">' + catIcon(t.category) + '</span>' +
      '<span class="mid"><span class="t1">' + esc(t.note || t.category) + (t.type === 'saved' ? '<span class="tag green">nhịn được</span>' : t.amount >= 1000000 ? '<span class="tag">khoản lớn</span>' : '') + '</span><span class="t2">' + sub + '</span></span>' +
      '<span class="amt num' + (t.type === 'saved' ? ' saved' : '') + '">' + (t.type === 'saved' ? '+' : '−') + money(t.amount) + '</span>' +
      '</button></li>';
  }

  function progress(value, max, st) {
    var pct = max ? Math.min(100, value / max * 100) : value > 0 ? 100 : 0;
    return '<div class="progress ' + (st || '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><span style="width:' + pct.toFixed(1) + '%"></span></div>';
  }

  var REMINDERS = [
    'Không cần hoàn hảo. Chỉ cần ghi lại từng khoản là bạn đã tiến bộ rồi.',
    'Thứ bạn không mua hôm nay là món quà cho bạn của ngày mai.',
    'Tiết kiệm là một cách tử tế với chính mình.',
    'Hôm nay lỡ tay cũng không sao, ngày mai mình cân lại nhẹ nhàng.',
    'Nhìn rõ tiền đi đâu là bước đầu tiên để giữ được nó.',
    'Mua ít đi một chút, sống thong thả hơn nhiều.',
    'Một ly cà phê ở nhà cũng thơm như ngoài quán, nếu mình pha bằng sự kiên nhẫn.',
    'Từng bước nhỏ vẫn đưa bạn đi xa.',
    'Trước khi mua, thử đợi 24 giờ xem mình còn muốn không nhé.'
  ];
  function reminderOfDay() {
    var d = new Date(), k = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    return REMINDERS[k % REMINDERS.length];
  }
  function greetWord() {
    var h = new Date().getHours();
    return h < 11 ? 'Chào buổi sáng,' : h < 14 ? 'Chào buổi trưa,' : h < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,';
  }

  /* Minh hoạ nhỏ (SVG) */
  var ART = {
    leaf: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 25 C7 13 15 6 26 6 C26 17 19 25 7 25Z" fill="#9bb97c" stroke="#4b4237" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 24 C13 18 17 14 22 10" fill="none" stroke="#4b4237" stroke-width="1.4" stroke-linecap="round"/></svg>',
    wallet: '<svg viewBox="0 0 36 36" aria-hidden="true"><rect x="5" y="10" width="26" height="19" rx="5" fill="#f2b9a0" stroke="#4b4237" stroke-width="1.6"/><path d="M8 10 L23 5 Q26 4 26.5 7 L27 10" fill="#fbe6da" stroke="#4b4237" stroke-width="1.6" stroke-linejoin="round"/><rect x="21" y="16" width="10" height="7" rx="3.5" fill="#fffaf1" stroke="#4b4237" stroke-width="1.6"/><circle cx="25" cy="19.5" r="1.4" fill="#4b4237"/></svg>',
    jar: '<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 9 V4" stroke="#4b4237" stroke-width="1.4" stroke-linecap="round"/><path d="M18 5 C15 2 11 3 11 5 C13 7 16 7 18 5Z M18 5 C21 1 25 2 25.5 4 C23 7 20 7 18 5Z" fill="#9bb97c" stroke="#4b4237" stroke-width="1.2"/><rect x="12" y="8" width="12" height="4" rx="1.5" fill="#e8dcbf" stroke="#4b4237" stroke-width="1.5"/><path d="M11 12 H25 Q29 15 29 22 V27 Q29 32 24 32 H12 Q7 32 7 27 V22 Q7 15 11 12Z" fill="#fffaf1" fill-opacity=".7" stroke="#4b4237" stroke-width="1.6"/><circle cx="14" cy="27" r="3.2" fill="#e2b65a" stroke="#4b4237" stroke-width="1.2"/><circle cx="21" cy="27.5" r="3.2" fill="#e2b65a" stroke="#4b4237" stroke-width="1.2"/><circle cx="17.5" cy="22.5" r="3.2" fill="#e2b65a" stroke="#4b4237" stroke-width="1.2"/></svg>',
    chart: '<svg viewBox="0 0 36 36" aria-hidden="true"><rect x="6" y="18" width="6" height="12" rx="2.5" fill="#cfdcbf" stroke="#4b4237" stroke-width="1.5"/><rect x="15" y="11" width="6" height="19" rx="2.5" fill="#9bb97c" stroke="#4b4237" stroke-width="1.5"/><rect x="24" y="6" width="6" height="24" rx="2.5" fill="#6f8f5e" stroke="#4b4237" stroke-width="1.5"/></svg>',
    target: '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="17" cy="19" r="12" fill="#fffaf1" stroke="#4b4237" stroke-width="1.6"/><circle cx="17" cy="19" r="7.5" fill="#b9bfe0" stroke="#4b4237" stroke-width="1.4"/><circle cx="17" cy="19" r="3" fill="#ef9f8a" stroke="#4b4237" stroke-width="1.3"/><path d="M17 19 L29 7" stroke="#4b4237" stroke-width="1.6" stroke-linecap="round"/><path d="M26 6 L30 6 L30 10" fill="none" stroke="#4b4237" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 23 C6 17 3 13 4.5 9.5 C6 6 10.5 6 14 10 C17.5 6 22 6 23.5 9.5 C25 13 22 17 14 23Z" fill="none" stroke="#5d7a60" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    sun: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6" fill="#e2b65a" stroke="#4b4237" stroke-width="1.5"/><g stroke="#e2b65a" stroke-width="2.2" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g></svg>',
    moon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M21 5 A11 11 0 1 0 27 21 A9 9 0 0 1 21 5Z" fill="#b9bfe0" stroke="#4b4237" stroke-width="1.5" stroke-linejoin="round"/><circle cx="24" cy="9" r="1.2" fill="#e2b65a"/></svg>'
  };

  function viewToday() {
    var s = monthSnapshot();
    var html = '';
    var todayLeft = s.allowance - s.dailyToday;
    var tSt = s.allowance ? budgetStatus(s.dailyToday, s.allowance) : (s.dailyToday > 0 ? 'over' : 'warn');
    var mood = !s.spentToday ? 'happy' : tSt === 'over' ? 'worried' : tSt === 'warn' ? 'ok' : 'happy';
    var head = !s.spentToday ? 'Hôm nay chưa chi đồng nào.' : 'Hôm nay bạn đã chi <span class="num">' + money(s.spentToday) + '</span>.';
    var sub = !s.budget ? 'Đặt ngân sách tháng để mình đồng hành cùng bạn nhé.'
      : !s.allowance ? 'Ngân sách sinh hoạt tháng này đã hết – mình chậm lại một chút nhé.'
      : todayLeft >= 0 ? 'Bạn vẫn còn <b class="num">' + money(todayLeft) + '</b> cho hôm nay.'
      : 'Đã quá mức hôm nay <b class="num">' + money(-todayLeft) + '</b>. Không sao, mai mình cân lại.';
    var note = !s.spentToday ? 'giỏi quá ♡' : tSt === 'over' ? 'từ từ thôi ♡' : 'từng bước nhỏ ♡';
    html += '<section class="greet"><div class="greet-text"><div class="greet-hi">' + greetWord() + '</div><h1 class="greet-h">' + head + '</h1><p class="greet-sub">' + sub + '</p></div>' +
      mascot(mood, 'greet-mascot') + '<span class="hand" aria-hidden="true">' + note + '</span></section>';

    // Thẻ chính: mức chi hôm nay
    if (s.budget) {
      html += '<div class="hero-wrap"><button type="button" class="soft-card" data-go="report"><span class="sc-ic">' + ART.leaf + '</span>' +
        '<span class="sc-t"><b>Mức chi mỗi ngày: <span class="num">' + money(s.allowance) + '</span></b><span>' +
        (s.allowance ? 'Tiền sinh hoạt còn lại ÷ ' + s.daysLeft + ' ngày còn lại' : 'Đã dùng hết tiền sinh hoạt của tháng') + '</span></span><span class="chev">›</span></button>' +
        progress(s.dailyToday, s.allowance, tSt) +
        '<div class="budget-sub"><span>Hôm nay đã dùng <b class="num">' + money(s.dailyToday) + '</b></span><span class="status ' + tSt + '">' + statusLabel(tSt) + '</span></div></div>';
    }

    // Ô truy cập nhanh
    html += '<div class="quick">' +
      '<button type="button" class="q-peach" data-quick="add">' + ART.wallet + 'Ghi chi</button>' +
      '<button type="button" class="q-sage" data-quick="saved">' + ART.jar + 'Nhịn được</button>' +
      '<button type="button" class="q-mustard" data-go="report">' + ART.chart + 'Báo cáo</button>' +
      '<button type="button" class="q-lavender" data-go="settings" data-anchor="budgets">' + ART.target + 'Hạn mức</button></div>';

    // Lời nhắn hôm nay
    html += '<div class="sec-head"><h3>Lời nhắn hôm nay</h3></div><div class="reminder"><p>“' + esc(reminderOfDay()) + '”</p>' + ART.heart + '</div>';

    // Dành cho bạn
    var wk = weekData(s);
    var mPct = s.budget ? Math.round(s.spent / s.budget * 100) : 0;
    html += '<div class="sec-head"><h3>Dành cho bạn</h3><button class="link" data-go="report">Xem báo cáo</button></div><div class="fy">' +
      '<button type="button" class="fy-card q-peach" data-go="report">' + ART.sun + '<span class="fy-k">Tuần này</span><span class="fy-v">' + wk.got + '/' + wk.past + '</span><span class="fy-s">ngày giữ mức</span></button>' +
      '<button type="button" class="fy-card q-lavender" data-go="report">' + ART.moon + '<span class="fy-k">Tháng ' + (s.m + 1) + '</span><span class="fy-v">' + (s.budget ? mPct + '%' : compact(s.spent)) + '</span><span class="fy-s">' + (s.budget ? compact(s.spent) + ' / ' + compact(s.budget) : 'đã chi') + '</span></button>' +
      '<button type="button" class="fy-card q-sage" data-go="history">' + ART.jar + '<span class="fy-k">Nhịn được</span><span class="fy-v">' + compact(s.saved) + '</span><span class="fy-s">tháng này</span></button></div>';

    if (s.budget && s.day >= 3 && s.projected > s.budget * 1.02) {
      html += '<div class="alert over" role="note"><span class="a-ic">!</span><span>Với nhịp hiện tại, cuối tháng có thể chi khoảng <b class="num">' + money(s.projected) +
        '</b> – vượt ngân sách <b class="num">' + money(s.projected - s.budget) + '</b>.</span></div>';
    }

    if (s.budget) html += '<section class="card"><div class="card-head"><h3>Chuỗi giữ mức tuần này</h3><span class="tag gold">' + wk.got + '/' + wk.past + ' ngày</span></div>' + wk.html +
      '<div class="stamp-sum">Ngày giữ mức: chi sinh hoạt ≤ <b class="num">' + compact(s.dailyBase) + '</b> (không tính khoản cố định).</div></section>';

    var rows = budgetRows(s.monthTx);
    if (rows.length) {
      html += '<section class="card"><div class="card-head"><h3>Hạn mức tháng ' + (s.m + 1) + '</h3><button class="link" data-go="settings" data-anchor="budgets">Sửa</button></div>';
      rows.forEach(function (r) {
        var left = (+r.b.limit) - r.spent;
        html += '<div class="budget-item"><div class="budget-top"><span class="name">' + esc(r.b.name) + '</span><span class="num">' + compact(r.spent) + ' / ' + compact(+r.b.limit) + '</span></div>' +
          progress(r.spent, +r.b.limit, r.st) +
          '<div class="budget-sub"><span>' + (left >= 0 ? 'Còn ' + money(left) : 'Vượt ' + money(-left)) + '</span><span class="status ' + r.st + '">' + statusLabel(r.st) + '</span></div></div>';
      });
      html += '</section>';
    }

    var todayList = state.tx.filter(function (t) { return t.date === today(); }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    html += '<section class="card"><div class="card-head"><h3>Khoản chi hôm nay</h3>' + (todayList.length ? '<span class="subtitle">' + todayList.length + ' khoản</span>' : '') + '</div>';
    if (todayList.length) html += '<ul class="tx-list">' + todayList.map(function (t) { return txItem(t, false); }).join('') + '</ul>';
    else html += '<div class="empty">' + mascot('sleepy', 'e-mascot') + 'Chưa có khoản nào hôm nay.<br>Bấm <b>Ghi</b> ở dưới để thêm nhé.</div>';
    html += '</section>';

    if (!state.tx.length) {
      html += '<section class="card"><h3>Bắt đầu nhẹ nhàng</h3><p class="help">Kết nối Google Sheet ở <b>Cài đặt</b> để mang toàn bộ dữ liệu cũ vào app. Hoặc thử app với dữ liệu mẫu trước.</p>' +
        '<div class="btn-row"><button class="btn primary" data-go="settings">Kết nối Google Sheet</button><button class="btn" id="demoBtn">Dùng thử dữ liệu mẫu</button></div></section>';
    }
    return html;
  }

  /** Chuỗi giữ mức tuần: ngày nào chi sinh hoạt ≤ mức trung bình/ngày là giữ mức */
  function weekData(s) {
    var now = new Date(), dow = (now.getDay() + 6) % 7, t = today();
    var html = '', got = 0, past = 0;
    for (var i = 0; i < 7; i++) {
      var d = addDays(now, i - dow), ds = ymd(d);
      var spent = sum(state.tx.filter(function (x) { return x.date === ds && x.type !== 'saved' && s.isDaily(x); }));
      var cls = '', ic = '';
      if (ds > t) { cls = 'future'; }
      else if (spent <= (ds === t && s.allowance ? Math.min(s.allowance, s.dailyBase) : ds === t ? 0 : s.dailyBase) || (ds === t && !spent)) { cls = 'ok'; ic = '✓'; if (ds < t) got++; }
      else { cls = 'over'; ic = '✕'; }
      if (ds < t) past++;
      if (ds === t) cls += ' today';
      html += '<div class="stamp ' + cls + '" title="' + DOW[d.getDay()] + ': ' + money(spent) + '"><span class="s-ic">' + ic + '</span>' + (ds === t ? 'Nay' : DOW[d.getDay()]) + '</div>';
    }
    return { html: '<div class="stamps">' + html + '</div>', got: got, past: past };
  }

  /* ---------- Report ---------- */
  function periodRange(period, offset) {
    var now = new Date();
    if (period === 'week') {
      var dow = (now.getDay() + 6) % 7; // thứ 2 = 0
      var start = addDays(now, -dow + offset * 7);
      var end = addDays(start, 6);
      return { from: ymd(start), to: ymd(end), label: pad(start.getDate()) + '/' + pad(start.getMonth() + 1) + ' – ' + pad(end.getDate()) + '/' + pad(end.getMonth() + 1), days: 7, start: start };
    }
    if (period === 'year') {
      var y = now.getFullYear() + offset;
      return { from: y + '-01-01', to: y + '-12-31', label: 'Năm ' + y, year: y };
    }
    var d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    var r = monthRange(d.getFullYear(), d.getMonth());
    return { from: r[0], to: r[1], label: 'Tháng ' + (d.getMonth() + 1) + '/' + d.getFullYear(), days: daysInMonth(d.getFullYear(), d.getMonth()), start: d, y: d.getFullYear(), m: d.getMonth() };
  }

  function deltaHtml(cur, prev, label) {
    if (!prev) return '<span class="delta flat">Chưa có dữ liệu ' + label + '</span>';
    var p = (cur - prev) / prev * 100;
    var cls = Math.abs(p) < 1 ? 'flat' : p > 0 ? 'up' : 'down';
    return '<span class="delta ' + cls + '">' + (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(Math.round(p)) + '% so với ' + label + '</span>';
  }

  /** Biểu đồ cột 1 chuỗi (SVG). points: [{label, value, tip, hl}] */
  function barChart(points, opts) {
    opts = opts || {};
    var W = 340, H = 170, padL = 34, padB = 22, padT = 14, padR = 4;
    var maxV = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([opts.ref || 0, 1]));
    var nice = niceMax(maxV);
    var iw = W - padL - padR, ih = H - padT - padB;
    var bw = iw / points.length;
    var barW = Math.max(2, Math.min(28, bw - 2));
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title || 'Biểu đồ') + '">';
    [0, 0.5, 1].forEach(function (f) {
      var yy = padT + ih - ih * f;
      svg += '<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yy + '" y2="' + yy + '"/>';
      svg += '<text class="axis" x="' + (padL - 4) + '" y="' + (yy + 3) + '" text-anchor="end">' + compact(nice * f) + '</text>';
    });
    var every = Math.ceil(points.length / 8);
    points.forEach(function (p, i) {
      var h = p.value / nice * ih;
      var x = padL + i * bw + (bw - barW) / 2;
      var y = padT + ih - h;
      var r = Math.min(4, barW / 2, h);
      svg += '<g' + (p.hl ? ' class="on"' : '') + '>';
      svg += '<rect class="hit" tabindex="0" data-tip="' + esc(p.tip) + '" x="' + (padL + i * bw) + '" y="' + padT + '" width="' + bw + '" height="' + ih + '"/>';
      if (h > 0) svg += '<path class="bar' + (p.dim ? ' dim' : '') + '" d="' + roundTop(x, y, barW, h, r) + '"/>';
      svg += '</g>';
      if (i % every === 0 || i === points.length - 1 && points.length <= 12) {
        svg += '<text class="axis" x="' + (padL + i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(p.label) + '</text>';
      }
    });
    if (opts.ref) {
      var ry = padT + ih - opts.ref / nice * ih;
      svg += '<line class="ref" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + ry + '" y2="' + ry + '"/>';
    }
    return svg + '</svg>';
  }
  function roundTop(x, y, w, h, r) {
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * p >= v) return steps[i] * p;
    return 10 * p;
  }

  function viewReport() {
    var R = state.report, S = state.settings;
    var cur = periodRange(R.period, R.offset), prev = periodRange(R.period, R.offset - 1);
    var list = expenses(cur.from, cur.to), prevList = expenses(prev.from, prev.to);
    var total = sum(list), prevTotal = sum(prevList);
    var savedList = savedIn(cur.from, cur.to), saved = sum(savedList);
    var t = today();
    var html = '<div class="page-head"><h1>Báo cáo</h1><p>Nhìn lại một chút để đi tiếp nhẹ nhàng hơn.</p></div><div class="toolbar"><div class="pills" role="tablist">' +
      [['week', 'Tuần'], ['month', 'Tháng'], ['year', 'Năm']].map(function (p) {
        return '<button role="tab" data-period="' + p[0] + '" class="' + (R.period === p[0] ? 'on' : '') + '" aria-selected="' + (R.period === p[0]) + '">' + p[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="period-nav"><button class="icon-btn" data-shift="-1" aria-label="Kỳ trước">‹</button><span class="lbl">' + esc(cur.label) + '</span>' +
      '<button class="icon-btn" data-shift="1" aria-label="Kỳ sau"' + (R.offset >= 0 ? ' disabled' : '') + '>›</button></div></div>';

    // Số ngày trong kỳ và số ngày đã trôi qua
    var periodDays, elapsed;
    if (R.period === 'year') {
      var ys = new Date(cur.year, 0, 1);
      periodDays = Math.round((new Date(cur.year, 11, 31) - ys) / 864e5) + 1;
      elapsed = cur.to < t ? periodDays : Math.max(1, Math.round((parseYmd(t) - ys) / 864e5) + 1);
    } else {
      periodDays = cur.days;
      elapsed = cur.to < t ? cur.days : Math.max(1, Math.round((parseYmd(t) - parseYmd(cur.from)) / 864e5) + 1);
    }
    var running = cur.to >= t;
    var prevLabel = R.period === 'week' ? 'tuần trước' : R.period === 'month' ? 'tháng trước' : 'năm trước';
    var prevComparable = prevTotal;
    if (running && R.period !== 'year') {
      var cutoff = ymd(addDays(parseYmd(prev.from), elapsed - 1));
      prevComparable = sum(prevList.filter(function (x) { return x.date <= cutoff; }));
      prevLabel += ' (cùng kỳ)';
    }
    // Ngân sách & hạn mức quy đổi theo kỳ: tuần = 7/số ngày tháng, năm = ×12
    var factor = R.period === 'month' ? 1 : R.period === 'year' ? 12 : 7 / daysInMonth(cur.start.getFullYear(), cur.start.getMonth());
    var budget = (+S.monthlyBudget || 0) * factor;
    var used = budget ? total / budget : 0;
    var bSt = budgetStatus(total, budget);
    var paceFrac = running ? elapsed / periodDays : 1;

    // 1. KPI
    html += '<div class="dash"><div class="kpis full">' +
      '<div class="kpi main"><div class="k">Tổng chi tiêu</div><div class="row"><div class="v num">' + money(total) + '</div>' + deltaHtml(total, prevComparable, prevLabel) + '</div>' +
      '<div class="s">' + list.length + ' khoản · trung bình ' + money(total / elapsed) + '/ngày</div></div>' +
      '<div class="kpi"><div class="k">Ngân sách</div><div class="v num">' + (budget ? money(budget) : '—') + '</div><div class="s">' + (budget ? 'Đã dùng <b>' + Math.round(used * 100) + '%</b>' : 'Chưa đặt') + '</div></div>' +
      '<div class="kpi"><div class="k">' + (total <= budget || !budget ? 'Còn lại' : 'Vượt') + '</div><div class="v num">' + (budget ? money(Math.abs(budget - total)) : '—') + '</div><div class="s">' + (budget ? '<span class="status ' + bSt + '">' + statusLabel(bSt) + '</span>' : '&nbsp;') + '</div></div>' +
      '<div class="kpi"><div class="k">Nhịn được</div><div class="v num">' + money(saved) + '</div><div class="s">' + savedList.length + ' lần không mua</div></div>' +
      '</div>';

    // 2. Tổng chi so với ngân sách
    if (budget) {
      var scaleMax = Math.max(budget, total) * 1.04;
      var projected = running && elapsed ? total / elapsed * periodDays : total;
      html += '<section class="card full"><div class="card-head"><h3>Tổng chi so với ngân sách</h3><span class="status ' + bSt + '">' + statusLabel(bSt) + '</span></div>' +
        '<div class="cmp-top"><span>Đã chi <b class="num">' + money(total) + '</b></span><span class="val num">' + money(budget) + ' <small>ngân sách</small></span></div>' +
        '<div class="bullet big ' + bSt + '"><span class="fill" style="width:' + (total / scaleMax * 100).toFixed(1) + '%"></span>' +
        '<span class="limit" style="left:' + (budget / scaleMax * 100).toFixed(1) + '%"></span>' +
        (running ? '<span class="pace" style="left:' + (budget * paceFrac / scaleMax * 100).toFixed(1) + '%"></span>' : '') + '</div>' +
        '<div class="cmp-sub"><span>Đã dùng ' + Math.round(used * 100) + '% ngân sách' + (running ? ' · đã qua ' + Math.round(paceFrac * 100) + '% thời gian' : '') + '</span>' +
        (running ? '<span>Dự kiến cả kỳ: <b class="num">' + money(projected) + '</b></span>' : '') + '</div>' +
        '<div class="legend-inline"><span><i class="lim"></i>Ngân sách</span>' + (running ? '<span><i class="pace"></i>Mức nên chi đến hôm nay</span>' : '') + '</div></section>';
    }

    // 3. So sánh với hạn mức
    var groups = (S.budgets || []).map(function (b) {
      var spent = sum(list.filter(function (x) { return b.cats.indexOf(x.category) >= 0; }));
      var lim = (+b.limit || 0) * factor;
      return { name: b.name, cats: b.cats, spent: spent, limit: lim, st: budgetStatus(spent, lim) };
    });
    var grouped = {};
    (S.budgets || []).forEach(function (b) { b.cats.forEach(function (c) { grouped[c] = 1; }); });
    var outside = list.filter(function (x) { return !grouped[x.category]; });
    if (groups.length) {
      html += '<section class="card"><div class="card-head"><h3>So sánh với hạn mức</h3><button class="link" data-go="settings" data-anchor="budgets">Sửa hạn mức</button></div>';
      var gSpent = 0, gLimit = 0;
      groups.sort(function (a, b) { return (b.limit ? b.spent / b.limit : 0) - (a.limit ? a.spent / a.limit : 0); }).forEach(function (g) {
        gSpent += g.spent; gLimit += g.limit;
        var mx = Math.max(g.limit, g.spent) || 1;
        var pct = g.limit ? Math.round(g.spent / g.limit * 100) : 0;
        var left = g.limit - g.spent;
        html += '<div class="cmp-row"><div class="cmp-top"><span class="name">' + esc(g.name) + '</span><span class="val num">' + compact(g.spent) + ' <small>/ ' + compact(g.limit) + '</small></span></div>' +
          '<div class="bullet ' + g.st + '"><span class="fill" style="width:' + (g.spent / mx * 100).toFixed(1) + '%"></span><span class="limit" style="left:calc(' + (g.limit / mx * 100).toFixed(1) + '% - 1px)"></span></div>' +
          '<div class="cmp-sub"><span class="status ' + g.st + '">' + statusLabel(g.st) + ' · ' + pct + '%</span><span class="num">' + (left >= 0 ? 'còn ' + money(left) : 'vượt ' + money(-left)) + '</span></div></div>';
      });
      if (outside.length) {
        html += '<div class="cmp-row"><div class="cmp-top"><span class="name">Ngoài hạn mức</span><span class="val num">' + compact(sum(outside)) + ' <small>không giới hạn</small></span></div>' +
          '<div class="cmp-sub"><span class="cats">' + esc(byCategory(outside).map(function (c) { return c.name; }).join(', ')) + '</span></div></div>';
      }
      html += '<div class="cmp-total"><span>Tổng các nhóm</span><span class="num">' + money(gSpent) + ' / ' + money(gLimit) + '</span></div>' +
        '<div class="legend-inline"><span><i class="lim"></i>Hạn mức</span><span>✓ dưới 85% · ⚠ 85–100% · ✕ vượt</span></div></section>';
    }

    // 4. Phân loại các khoản
    var cats = byCategory(list), prevCats = {}, counts = {};
    byCategory(prevList).forEach(function (c) { prevCats[c.name] = c.total; });
    list.forEach(function (x) { counts[x.category] = (counts[x.category] || 0) + 1; });
    html += '<section class="card"><div class="card-head"><h3>Phân loại chi tiêu</h3><span class="subtitle">' + cats.length + ' hạng mục</span></div>';
    if (!cats.length) html += '<div class="empty">' + mascot('sleepy', 'e-mascot') + 'Không có khoản chi nào trong kỳ này.</div>';
    else {
      html += '<table class="cat-table"><thead><tr><th>Hạng mục</th><th>Số tiền</th><th>' + (running ? 'Tỷ trọng' : 'So kỳ trước') + '</th></tr></thead><tbody>';
      cats.forEach(function (c) {
        var pct = total ? c.total / total * 100 : 0;
        var pv = prevCats[c.name] || 0;
        var ch = pv ? Math.round((c.total - pv) / pv * 100) : null;
        var third = running || ch === null ? Math.round(pct) + '%' : '<span class="delta ' + (ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat') + '">' + (ch > 0 ? '▲ ' : ch < 0 ? '▼ ' : '') + Math.abs(ch) + '%</span>';
        html += '<tr><td><div class="nm"><span class="ic ' + catTint(c.name) + '">' + catIcon(c.name) + '</span><span style="flex:1;min-width:0">' + esc(c.name) + '<small>' + counts[c.name] + ' khoản · ' + Math.round(pct) + '%</small>' +
          '<div class="share"><span style="width:' + pct.toFixed(1) + '%"></span></div></span></div></td>' +
          '<td class="num">' + money(c.total) + '</td><td class="pct num">' + third + '</td></tr>';
      });
      html += '</tbody><tfoot><tr><td>Tổng</td><td class="num">' + money(total) + '</td><td class="pct">100%</td></tr></tfoot></table>';
    }
    html += '</section>';

    // 5. Biểu đồ theo ngày / tháng
    var points = [], tableRows = [];
    if (R.period === 'year') {
      for (var mm = 0; mm < 12; mm++) {
        var mr = monthRange(cur.year, mm);
        var v = sum(list.filter(function (x) { return x.date >= mr[0] && x.date <= mr[1]; }));
        points.push({ label: 'T' + (mm + 1), value: v, tip: 'Tháng ' + (mm + 1) + '|' + money(v), dim: mr[0] > t });
        tableRows.push(['Tháng ' + (mm + 1), v]);
      }
    } else {
      for (var i = 0; i < cur.days; i++) {
        var d = addDays(cur.start, i), ds = ymd(d);
        var dv = sum(list.filter(function (x) { return x.date === ds; }));
        points.push({ label: R.period === 'week' ? DOW[d.getDay()] : String(d.getDate()), value: dv, tip: DOW[d.getDay()] + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '|' + money(dv), dim: ds > t, hl: ds === t });
        tableRows.push([DOW[d.getDay()] + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1), dv]);
      }
    }
    var ref = S.monthlyBudget ? (R.period === 'year' ? +S.monthlyBudget : S.monthlyBudget / daysInMonth(cur.start.getFullYear(), cur.start.getMonth())) : 0;
    var refLabel = R.period === 'year' ? 'Ngân sách/tháng' : 'Mức TB/ngày ' + compact(ref);
    html += '<section class="card"><h3>' + (R.period === 'year' ? 'Chi theo tháng' : 'Chi theo ngày') + '</h3>' +
      barChart(points, { ref: ref, title: 'Chi tiêu ' + cur.label }) +
      '<div class="chart-caption"><span class="key"><i></i>Số tiền chi</span>' + (R.period !== 'year' && R.offset === 0 ? '<span class="key"><i class="today"></i>Hôm nay</span>' : '') + (ref ? '<span class="key"><i class="line"></i>' + esc(refLabel) + '</span>' : '') + '</div>' +
      '<details class="table-view"><summary>Xem dạng bảng</summary><table class="mini-table"><tbody>' +
      tableRows.filter(function (r) { return r[1]; }).map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="num">' + money(r[1]) + '</td></tr>'; }).join('') +
      '</tbody></table></details></section>';

    // 6. Xu hướng 12 tháng
    if (R.period === 'month') {
      var trend = [];
      for (var k = 11; k >= 0; k--) {
        var pr = periodRange('month', R.offset - k);
        var tv = sum(expenses(pr.from, pr.to));
        trend.push({ label: 'T' + (pr.m + 1), value: tv, tip: pr.label + '|' + money(tv), hl: k === 0 });
      }
      var nz = trend.filter(function (p) { return p.value; });
      var avg = nz.length ? nz.reduce(function (a, p) { return a + p.value; }, 0) / nz.length : 0;
      var overN = S.monthlyBudget ? nz.filter(function (p) { return p.value > S.monthlyBudget; }).length : 0;
      html += '<section class="card"><h3>Xu hướng 12 tháng</h3>' + barChart(trend, { ref: +S.monthlyBudget, title: 'Xu hướng 12 tháng' }) +
        '<div class="chart-caption"><span class="key"><i></i>Tổng chi tháng</span>' + (S.monthlyBudget ? '<span class="key"><i class="line"></i>Ngân sách ' + compact(+S.monthlyBudget) + '</span>' : '') + '</div>' +
        '<p class="help">Trung bình <b class="num">' + money(avg) + '</b>/tháng' + (S.monthlyBudget ? ' · ' + overN + '/' + nz.length + ' tháng vượt ngân sách' : '') + '.</p></section>';
    }

    // 7. Nhận xét + khoản lớn
    var ins = insights(list, prevList, cats, prevCats, cur, elapsed, total);
    if (ins.length) {
      html += '<section class="card"><h3>Nhận xét</h3><ul class="insights">' + ins.map(function (x) {
        return '<li><span class="i-ic">' + x[0] + '</span><span>' + x[1] + '</span></li>';
      }).join('') + '</ul></section>';
    }
    var big = list.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);
    if (big.length) html += '<section class="card"><h3>5 khoản chi lớn nhất</h3><ul class="tx-list">' + big.map(function (x) { return txItem(x, true); }).join('') + '</ul></section>';
    return html + '</div>';
  }

  function insights(list, prevList, cats, prevCats, cur, elapsed, total) {
    var out = [];
    if (!list.length) return out;
    if (cats[0] && total) out.push(['🥇', '<b>' + esc(cats[0].name) + '</b> chiếm nhiều nhất: <b class="num">' + Math.round(cats[0].total / total * 100) + '%</b> tổng chi (' + money(cats[0].total) + ').']);
    var t = today();
    if (cur.to < t && prevList.length) {
      var incr = cats.map(function (c) { return { name: c.name, diff: c.total - (prevCats[c.name] || 0) }; }).sort(function (a, b) { return b.diff - a.diff; });
      if (incr[0] && incr[0].diff > 0) out.push(['📈', '<b>' + esc(incr[0].name) + '</b> tăng mạnh nhất so với kỳ trước: <b class="num">+' + money(incr[0].diff) + '</b>.']);
      var dec = incr[incr.length - 1];
      if (dec && dec.diff < 0) out.push(['📉', '<b>' + esc(dec.name) + '</b> giảm nhiều nhất: <b class="num">' + money(dec.diff) + '</b>. Tốt lắm!']);
    }
    // Ngày trong tuần chi nhiều nhất
    var dowSum = [0, 0, 0, 0, 0, 0, 0];
    list.forEach(function (x) { dowSum[parseYmd(x.date).getDay()] += +x.amount; });
    var maxD = dowSum.indexOf(Math.max.apply(null, dowSum));
    if (list.length > 5) out.push(['📅', 'Bạn hay chi nhiều nhất vào <b>' + DOW_LONG[maxD] + '</b>.']);
    // Ngày không chi
    var spentDays = {};
    list.forEach(function (x) { spentDays[x.date] = 1; });
    var noSpend = elapsed - Object.keys(spentDays).length;
    if (noSpend > 0) out.push(['🌿', '<b>' + noSpend + ' ngày</b> không chi đồng nào.']);
    // Coffee/ăn vặt nhỏ lẻ
    var small = list.filter(function (x) { return x.amount <= 50000; });
    if (small.length >= 10) out.push(['☕', '<b>' + small.length + '</b> khoản nhỏ (≤50k) cộng lại thành <b class="num">' + money(sum(small)) + '</b> – các khoản nhỏ cũng đáng để ý.']);
    return out;
  }

  /* ---------- History ---------- */
  function viewHistory() {
    var H = state.hist;
    var q = H.q.trim().toLowerCase();
    var list = state.tx.filter(function (t) {
      if (H.cat && t.category !== H.cat) return false;
      if (H.type && t.type !== H.type) return false;
      if (q && (t.note + ' ' + t.category + ' ' + t.amount).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0); });
    var catsUsed = {};
    state.tx.forEach(function (t) { catsUsed[t.category] = 1; });
    var catNames = state.settings.categories.map(function (c) { return c.name; });
    Object.keys(catsUsed).forEach(function (c) { if (catNames.indexOf(c) < 0) catNames.push(c); });

    var html = '<div class="page-head"><h1>Lịch sử</h1><p>Mọi khoản bạn đã ghi, gọn gàng một chỗ.</p></div><div class="filters"><input id="histQ" type="search" placeholder="Tìm ghi chú, hạng mục, số tiền…" value="' + esc(H.q) + '" aria-label="Tìm kiếm">' +
      '<select id="histCat" aria-label="Lọc hạng mục"><option value="">Tất cả hạng mục</option>' +
      catNames.map(function (c) { return '<option' + (H.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="pills" role="tablist" style="margin-bottom:6px">' + [['', 'Tất cả'], ['expense', 'Chi tiêu'], ['saved', '💪 Nhịn được']].map(function (p) {
        return '<button data-htype="' + p[0] + '" class="' + (H.type === p[0] ? 'on' : '') + '">' + p[1] + '</button>';
      }).join('') + '</div>';
    var totalExp = sum(list.filter(function (t) { return t.type !== 'saved'; }));
    html += '<div class="help">' + list.length + ' khoản · tổng chi <b class="num">' + money(totalExp) + '</b></div>';
    if (!list.length) return html + '<div class="card empty">' + mascot('worried', 'e-mascot') + 'Không tìm thấy khoản nào.</div>';
    var shown = list.slice(0, H.limit);
    var groups = [], cur = null;
    shown.forEach(function (t) {
      if (!cur || cur.date !== t.date) { cur = { date: t.date, items: [] }; groups.push(cur); }
      cur.items.push(t);
    });
    groups.forEach(function (g) {
      var d = parseYmd(g.date);
      var dayTotal = sum(state.tx.filter(function (t) { return t.date === g.date && t.type !== 'saved'; }));
      var name = g.date === today() ? 'Hôm nay' : g.date === ymd(addDays(new Date(), -1)) ? 'Hôm qua' : DOW_LONG[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
      html += '<div class="day-head"><span>' + name + '</span><span class="num">' + money(dayTotal) + '</span></div>' +
        '<div class="card" style="margin-top:4px;padding:6px 14px"><ul class="tx-list">' + g.items.map(function (t) { return txItem(t, false); }).join('') + '</ul></div>';
    });
    if (list.length > H.limit) html += '<div class="btn-row" style="justify-content:center"><button class="btn" id="moreBtn">Xem thêm (' + (list.length - H.limit) + ')</button></div>';
    return html;
  }

  /* ---------- Settings ---------- */
  function viewSettings() {
    var S = state.settings, C = state.conn;
    var html = '<div class="page-head"><h1>Cài đặt</h1><p>Tuỳ chỉnh để app hợp với bạn hơn.</p></div><section class="card" id="conn"><h3>Kết nối Google Sheet</h3>' +
      (C.url ? '<p class="help">Trạng thái: <b>' + (state.syncError ? '⚠ ' + esc(state.syncError) : state.lastSync ? '✓ Đồng bộ lúc ' + new Date(state.lastSync).toLocaleString('vi-VN') : 'Chưa đồng bộ') + '</b>' +
        (state.queue.length ? ' · ' + state.queue.length + ' thay đổi chờ gửi' : '') + '</p>' :
        '<div class="help">Dữ liệu đang chỉ lưu trên máy này. Kết nối để lưu vào Google Sheet và dùng trên nhiều thiết bị:<ol>' +
        '<li>Mở Google Sheet → <b>Tiện ích mở rộng → Apps Script</b>.</li>' +
        '<li>Xoá code mẫu, dán toàn bộ file <code>apps-script/Code.gs</code> (trong repo), bấm Lưu.</li>' +
        '<li>Tải lại Google Sheet → menu <b>Costee → Khởi tạo</b> → chép <b>mã bí mật</b>.</li>' +
        '<li>Trong Apps Script: <b>Triển khai → Tùy chọn triển khai mới → Ứng dụng web</b>, "Người có quyền truy cập": <b>Bất kỳ ai</b> → chép URL.</li>' +
        '<li>Dán URL và mã vào đây → <b>Kết nối</b>.</li></ol></div>') +
      '<label class="field"><span class="field-label">URL ứng dụng web</span><input id="connUrl" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(C.url) + '"></label>' +
      '<label class="field"><span class="field-label">Mã bí mật</span><input id="connToken" placeholder="16 ký tự" value="' + esc(C.token) + '"></label>' +
      '<div class="btn-row"><button class="btn primary" id="connSave">' + (C.url ? 'Lưu & kiểm tra' : 'Kết nối') + '</button>' +
      (C.url ? '<button class="btn" id="syncNow">Đồng bộ ngay</button><button class="btn" id="importOld">Nhập dữ liệu cũ từ tab "1. Chi tiêu"</button><button class="btn ghost danger" id="connRemove">Ngắt kết nối</button>' : '') +
      '</div></section>';

    html += '<section class="card"><h3>Ngân sách tháng</h3><label class="field"><span class="field-label">Tổng được chi mỗi tháng</span>' +
      '<input id="monthlyBudget" inputmode="decimal" value="' + nf.format(+S.monthlyBudget || 0) + '"></label>' +
      '<p class="help">Gõ nhanh: 9tr, 9.000.000… App dùng số này để tính <b>mức được chi mỗi ngày</b>.</p>' +
      '<div class="field-label">Khoản cố định (không tính vào mức chi mỗi ngày)</div><div class="check-grid">' +
      S.categories.map(function (c) {
        return '<label><input type="checkbox" data-excl="' + esc(c.name) + '"' + ((S.excludeFromDaily || []).indexOf(c.name) >= 0 ? ' checked' : '') + '> ' + c.icon + ' ' + esc(c.name) + '</label>';
      }).join('') + '</div></section>';

    html += '<section class="card" id="budgets"><div class="card-head"><h3>Hạn mức theo nhóm</h3><button class="link" id="addBudget">+ Thêm nhóm</button></div>' +
      '<p class="help">Mỗi nhóm có thể gồm nhiều hạng mục (vd "Quần áo & mỹ phẩm"). App cảnh báo khi dùng ≥ 85%.</p>';
    (S.budgets || []).forEach(function (b, i) {
      html += '<div class="group-edit" data-bi="' + i + '"><div class="g-row">' +
        '<input class="input" data-bf="name" value="' + esc(b.name) + '" aria-label="Tên nhóm">' +
        '<input class="input num" data-bf="limit" inputmode="decimal" value="' + nf.format(+b.limit || 0) + '" aria-label="Hạn mức">' +
        '<button class="icon-btn" data-bdel="' + i + '" aria-label="Xoá nhóm">✕</button></div>' +
        '<details><summary>Hạng mục: ' + (b.cats.length ? esc(b.cats.join(', ')) : '<i>chưa chọn</i>') + '</summary><div class="check-grid">' +
        S.categories.map(function (c) {
          return '<label><input type="checkbox" data-bcat="' + esc(c.name) + '"' + (b.cats.indexOf(c.name) >= 0 ? ' checked' : '') + '> ' + c.icon + ' ' + esc(c.name) + '</label>';
        }).join('') + '</div></details></div>';
    });
    html += '</section>';

    html += '<section class="card"><div class="card-head"><h3>Hạng mục</h3><button class="link" id="addCat">+ Thêm</button></div>';
    S.categories.forEach(function (c, i) {
      html += '<div class="cat-edit" data-ci="' + i + '"><input class="input emoji" data-cf="icon" value="' + esc(c.icon) + '" aria-label="Biểu tượng" maxlength="4">' +
        '<input class="input" data-cf="name" value="' + esc(c.name) + '" aria-label="Tên hạng mục">' +
        '<button class="icon-btn" data-cdel="' + i + '" aria-label="Xoá">✕</button></div>';
    });
    html += '<p class="help">Đổi tên hạng mục sẽ đổi luôn các khoản chi cũ thuộc hạng mục đó.</p></section>';

    html += '<section class="card"><h3>Dữ liệu</h3><p class="help">' + state.tx.length + ' khoản trên máy này.</p><div class="btn-row">' +
      '<button class="btn" id="exportCsv">Tải về CSV</button>' +
      (!state.conn.url ? '<button class="btn" id="demoBtn">Nạp dữ liệu mẫu</button>' : '') +
      '<button class="btn ghost danger" id="wipeLocal">Xoá dữ liệu trên máy này</button></div>' +
      '<p class="help">Mẹo: trên iPhone bấm <b>Chia sẻ → Thêm vào MH chính</b>, trên Android bấm <b>⋮ → Cài đặt ứng dụng</b> để dùng như app thật.</p></section>';
    return html;
  }

  /* ================= Add / edit sheet ================= */
  var form = { type: 'expense', category: 'Tiền ăn' };

  function catOrder() {
    var since = ymd(addDays(new Date(), -60)), freq = {};
    state.tx.forEach(function (t) { if (t.date >= since) freq[t.category] = (freq[t.category] || 0) + 1; });
    var base = state.settings.categories.slice();
    return base.map(function (c, i) { return { c: c, f: freq[c.name] || 0, i: i }; })
      .sort(function (a, b) { return b.f - a.f || a.i - b.i; }).map(function (x) { return x.c; });
  }

  function openSheet(tx) {
    state.editing = tx ? tx.id : null;
    form.type = tx ? tx.type : 'expense';
    var cats = catOrder();
    form.category = tx ? tx.category : (cats[0] ? cats[0].name : 'Khác');
    $('#sheetTitle').textContent = tx ? 'Sửa khoản' : 'Thêm khoản chi';
    $('#amount').value = tx ? nf.format(tx.amount) : '';
    $('#date').value = tx ? tx.date : today();
    $('#note').value = tx ? tx.note : '';
    $('#deleteBtn').hidden = !tx;
    $$('input[name=type]').forEach(function (r) { r.checked = r.value === form.type; });
    $('#typeHint').hidden = form.type !== 'saved';
    $('#sheetMascot').innerHTML = mascot(form.type === 'saved' ? 'proud' : 'happy');
    $('#sheetSub').textContent = form.type === 'saved' ? 'Một món không mua cũng đáng để ăn mừng.' : 'Ghi lại một chút, nhẹ lòng hơn nhiều.';
    renderCatGrid(tx && cats.every(function (c) { return c.name !== tx.category; }) ? cats.concat([{ name: tx.category, icon: '📦' }]) : cats);
    renderNotes();
    updatePreview();
    $('#sheet').hidden = false; $('#sheetBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#amount').focus(); }, 60);
  }
  function closeSheet() {
    $('#sheet').hidden = true; $('#sheetBackdrop').hidden = true; document.body.style.overflow = '';
    state.editing = null;
  }
  function renderCatGrid(cats) {
    $('#catGrid').innerHTML = cats.map(function (c) {
      return '<button type="button" data-cat="' + esc(c.name) + '" class="' + (c.name === form.category ? 'on' : '') + '" aria-pressed="' + (c.name === form.category) + '"><span class="e">' + c.icon + '</span><span>' + esc(c.name) + '</span></button>';
    }).join('');
  }
  function renderNotes() {
    var seen = {}, notes = [];
    state.tx.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }).forEach(function (t) {
      if (t.note && !seen[t.note] && t.category === form.category && notes.length < 12) { seen[t.note] = 1; notes.push(t.note); }
    });
    $('#noteList').innerHTML = notes.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  }
  function updatePreview() {
    var v = parseAmount($('#amount').value);
    $('#amountPreview').textContent = $('#amount').value ? (v ? '= ' + money(v) : 'Số tiền chưa hợp lệ') : 'Gõ 45 = 45.000₫ · 1.2tr = 1.200.000₫';
  }

  function submitForm(e) {
    e.preventDefault();
    var amount = parseAmount($('#amount').value);
    if (!amount || amount <= 0) { toast('Nhập số tiền hợp lệ nhé', 'worried'); $('#amount').focus(); return; }
    var date = $('#date').value || today();
    var existing = state.editing ? state.tx.filter(function (t) { return t.id === state.editing; })[0] : null;
    var t = Object.assign({}, existing || { id: uid() }, {
      date: date, amount: amount, category: form.category, note: $('#note').value.trim(), type: form.type
    });
    upsertTx(t);
    closeSheet();
    if (form.type === 'saved') {
      toast('Tuyệt! Đã nhịn được ' + money(amount) + ' 💪', 'proud');
    } else if (date === today() && state.settings.monthlyBudget) {
      var s = monthSnapshot(), left = s.allowance - s.dailyToday;
      toast('Đã lưu ' + money(amount) + ' · ' + (left >= 0 ? 'hôm nay còn ' + money(left) : 'vượt mức hôm nay ' + money(-left)), left >= 0 ? 'ok' : 'shocked');
    } else toast('Đã lưu ' + money(amount));
  }

  /* ================= Toast & tooltip ================= */
  var toastTimer;
  function toast(msg, mood) {
    var el = $('#toast'); el.textContent = msg; el.classList.toggle('err', mood === 'worried' || mood === 'shocked'); el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2800);
  }
  function showTip(target) {
    var parts = (target.getAttribute('data-tip') || '').split('|');
    var tip = $('#tooltip');
    tip.textContent = '';
    var strong = document.createElement('strong'); strong.textContent = parts[1] || '';
    var span = document.createElement('span'); span.textContent = parts[0] || '';
    tip.appendChild(strong); tip.appendChild(span);
    tip.hidden = false;
    var r = target.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
    var y = Math.max(8, r.top - th - 6);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    $$('.chart g.on.tmp').forEach(function (g) { g.classList.remove('on', 'tmp'); });
    var g = target.parentNode; if (!g.classList.contains('on')) g.classList.add('on', 'tmp');
  }
  function hideTip() {
    $('#tooltip').hidden = true;
    $$('.chart g.on.tmp').forEach(function (g) { g.classList.remove('on', 'tmp'); });
  }

  /* ================= Demo data ================= */
  function loadDemo() {
    var rnd = function (a, b) { return Math.round((a + Math.random() * (b - a)) / 1000) * 1000; };
    var now = new Date(), out = [];
    for (var i = 0; i < 75; i++) {
      var d = ymd(addDays(now, -i));
      var n = 1 + Math.floor(Math.random() * 3);
      for (var j = 0; j < n; j++) out.push({ id: uid(), date: d, amount: rnd(20000, 70000), category: 'Tiền ăn', note: ['Cơm trưa', 'Bún bò', 'Phở', 'Cơm tối'][j % 4], type: 'expense', createdAt: Date.now() - i * 864e5 + j });
      if (Math.random() < 0.45) out.push({ id: uid(), date: d, amount: rnd(29000, 65000), category: 'Coffee', note: 'Coffee học bài', type: 'expense', createdAt: Date.now() - i * 864e5 + 5 });
      if (Math.random() < 0.08) out.push({ id: uid(), date: d, amount: rnd(150000, 600000), category: ['Quần áo', 'Skincare/Mỹ phẩm', 'Mua quà', 'Sports'][i % 4], note: '', type: 'expense', createdAt: Date.now() - i * 864e5 + 6 });
      if (Math.random() < 0.05) out.push({ id: uid(), date: d, amount: rnd(200000, 800000), category: 'Quần áo', note: 'Trả hàng, không mua nữa', type: 'saved', createdAt: Date.now() - i * 864e5 + 7 });
      if (addDays(now, -i).getDate() === 5) out.push({ id: uid(), date: d, amount: 3200000, category: 'Phòng trọ', note: 'Tiền phòng', type: 'expense', createdAt: Date.now() - i * 864e5 + 8 });
      if (addDays(now, -i).getDate() === 10) out.push({ id: uid(), date: d, amount: 100000, category: 'Nuôi xe', note: 'Đổ xăng', type: 'expense', createdAt: Date.now() - i * 864e5 + 9 });
    }
    state.tx = out; save(); render(); toast('Đã nạp dữ liệu mẫu – xoá ở Cài đặt khi muốn dùng thật');
  }

  function exportCsv() {
    var rows = [['Ngày', 'Số tiền', 'Hạng mục', 'Ghi chú', 'Loại']];
    state.tx.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (t) {
      rows.push([t.date, t.amount, t.category, t.note, t.type === 'saved' ? 'Nhịn được' : 'Chi']);
    });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'costee-' + today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ================= Events ================= */
  function go(view, anchor) {
    state.view = view; store.set('view', view); hideTip(); render(); window.scrollTo(0, 0);
    if (anchor) setTimeout(function () { var el = document.getElementById(anchor); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 30);
  }

  function settingsCopy() { return JSON.parse(JSON.stringify(state.settings)); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-tip]');
    if (!t) { hideTip(); return; }
    if (t.matches('.tabbar [data-view]')) return go(t.dataset.view);
    if (t.id === 'fab' || t.dataset.quick === 'add') return openSheet(null);
    if (t.dataset.quick === 'saved') { openSheet(null); form.type = 'saved'; $$('input[name=type]').forEach(function (r) { r.checked = r.value === 'saved'; }); $('#typeHint').hidden = false; $('#sheetTitle').textContent = 'Ghi khoản nhịn được'; $('#sheetMascot').innerHTML = mascot('proud'); $('#sheetSub').textContent = 'Một món không mua cũng đáng để ăn mừng.'; return; }
    if (t.dataset.go) return go(t.dataset.go, t.dataset.anchor);
    if (t.dataset.edit) { var tx = state.tx.filter(function (x) { return x.id === t.dataset.edit; })[0]; if (tx) openSheet(tx); return; }
    if (t.dataset.period) { state.report = { period: t.dataset.period, offset: 0 }; return render(); }
    if (t.dataset.shift) { state.report.offset = Math.min(0, state.report.offset + +t.dataset.shift); return render(); }
    if (t.hasAttribute('data-htype')) { state.hist.type = t.dataset.htype; state.hist.limit = 40; return render(); }
    if (t.dataset.tip != null && t.matches('.hit')) return showTip(t);
    if (t.dataset.cat) { form.category = t.dataset.cat; $$('#catGrid button').forEach(function (b) { b.classList.toggle('on', b === t); b.setAttribute('aria-pressed', b === t); }); renderNotes(); return; }
    if (t.dataset.add) { var cur = parseAmount($('#amount').value); $('#amount').value = nf.format(cur + +t.dataset.add); updatePreview(); return; }
    if (t.dataset.day != null) { $('#date').value = ymd(addDays(new Date(), +t.dataset.day)); return; }
    if (t.dataset.bdel != null) { var s1 = settingsCopy(); s1.budgets.splice(+t.dataset.bdel, 1); return saveSettings(s1); }
    if (t.dataset.cdel != null) {
      var s2 = settingsCopy(), c = s2.categories[+t.dataset.cdel];
      var used = state.tx.filter(function (x) { return x.category === c.name; }).length;
      if (!confirm('Xoá hạng mục "' + c.name + '"?' + (used ? ' (' + used + ' khoản cũ vẫn giữ tên này)' : ''))) return;
      s2.categories.splice(+t.dataset.cdel, 1); return saveSettings(s2);
    }
    switch (t.id) {
      case 'sheetClose': return closeSheet();
      case 'deleteBtn':
        if (state.editing && confirm('Xoá khoản này?')) { deleteTx(state.editing); closeSheet(); toast('Đã xoá'); }
        return;
      case 'syncBtn': return state.conn.url ? sync() : go('settings', 'conn');
      case 'demoBtn': return loadDemo();
      case 'moreBtn': state.hist.limit += 60; return render();
      case 'exportCsv': return exportCsv();
      case 'addBudget': { var s3 = settingsCopy(); s3.budgets.push({ id: uid(), name: 'Nhóm mới', limit: 500000, cats: [] }); return saveSettings(s3); }
      case 'addCat': {
        var nm = prompt('Tên hạng mục mới:'); if (!nm || !nm.trim()) return;
        var s4 = settingsCopy();
        if (s4.categories.some(function (x) { return x.name === nm.trim(); })) return toast('Hạng mục đã có');
        s4.categories.push({ name: nm.trim(), icon: '🏷️' }); return saveSettings(s4);
      }
      case 'wipeLocal':
        if (!confirm(state.conn.url ? 'Xoá dữ liệu lưu tạm trên máy này? (Dữ liệu trên Google Sheet không bị ảnh hưởng, sẽ tải lại khi đồng bộ.)' : 'Xoá toàn bộ dữ liệu trên máy này? Không thể hoàn tác.')) return;
        state.tx = []; state.queue = []; save(); render(); if (state.conn.url) sync(); return;
      case 'connSave': return connect();
      case 'syncNow': return sync();
      case 'connRemove':
        if (!confirm('Ngắt kết nối Google Sheet trên máy này?')) return;
        state.conn = { url: '', token: '' }; state.queue = []; store.set('conn', state.conn); save(); return render();
      case 'importOld': return importOld();
    }
  });

  document.addEventListener('pointerover', function (e) { var h = e.target.closest && e.target.closest('.chart .hit'); if (h && e.pointerType === 'mouse') showTip(h); });
  document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest('.chart .hit') && e.pointerType === 'mouse') hideTip(); });
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('.chart .hit')) showTip(e.target); });
  window.addEventListener('scroll', hideTip, { passive: true });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'amount') return updatePreview();
    if (t.id === 'histQ') { state.hist.q = t.value; state.hist.limit = 40; return render(); }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'type') { form.type = t.value; $('#typeHint').hidden = form.type !== 'saved'; $('#sheetMascot').innerHTML = mascot(form.type === 'saved' ? 'proud' : 'happy'); $('#sheetSub').textContent = form.type === 'saved' ? 'Một món không mua cũng đáng để ăn mừng.' : 'Ghi lại một chút, nhẹ lòng hơn nhiều.'; $('#sheetTitle').textContent = state.editing ? 'Sửa khoản' : form.type === 'saved' ? 'Ghi khoản nhịn được' : 'Thêm khoản chi'; return; }
    if (t.id === 'histCat') { state.hist.cat = t.value; state.hist.limit = 40; return render(); }
    var s = settingsCopy();
    if (t.id === 'monthlyBudget') { s.monthlyBudget = parseAmountLoose(t.value); return saveSettings(s); }
    if (t.dataset.excl) {
      s.excludeFromDaily = (s.excludeFromDaily || []).filter(function (x) { return x !== t.dataset.excl; });
      if (t.checked) s.excludeFromDaily.push(t.dataset.excl);
      return saveSettings(s);
    }
    var ge = t.closest('.group-edit');
    if (ge) {
      var b = s.budgets[+ge.dataset.bi];
      if (t.dataset.bf === 'name') b.name = t.value.trim() || 'Nhóm';
      if (t.dataset.bf === 'limit') b.limit = parseAmountLoose(t.value);
      if (t.dataset.bcat) { b.cats = b.cats.filter(function (x) { return x !== t.dataset.bcat; }); if (t.checked) b.cats.push(t.dataset.bcat); }
      return saveSettings(s);
    }
    var ce = t.closest('.cat-edit');
    if (ce) {
      var c = s.categories[+ce.dataset.ci];
      if (t.dataset.cf === 'icon') c.icon = t.value.trim() || '🏷️';
      if (t.dataset.cf === 'name') {
        var nn = t.value.trim(), old = c.name;
        if (!nn || nn === old) return render();
        if (s.categories.some(function (x) { return x.name === nn; })) { toast('Tên đã tồn tại'); return render(); }
        c.name = nn;
        s.budgets.forEach(function (bg) { bg.cats = bg.cats.map(function (x) { return x === old ? nn : x; }); });
        s.excludeFromDaily = (s.excludeFromDaily || []).map(function (x) { return x === old ? nn : x; });
        var now = Date.now();
        state.tx = state.tx.map(function (x) {
          if (x.category !== old) return x;
          var nx = Object.assign({}, x, { category: nn, updatedAt: now });
          if (state.conn.url) {
            state.queue = state.queue.filter(function (q) { return !(q.tx && q.tx.id === nx.id); });
            state.queue.push({ op: 'upsert', tx: nx });
          }
          return nx;
        });
      }
      return saveSettings(s);
    }
  });

  // Số tiền trong cài đặt: "9tr", "9.000.000", "700k" (không áp dụng quy tắc "<1000 = nghìn" để tránh nhầm)
  function parseAmountLoose(v) {
    var s = String(v).trim();
    if (/^[\d.,\s]+$/.test(s)) return +s.replace(/[.,\s]/g, '') || 0;
    return parseAmount(s);
  }

  function connect() {
    var url = $('#connUrl').value.trim(), token = $('#connToken').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return toast('URL phải bắt đầu bằng https://script.google.com/…');
    if (!token) return toast('Nhập mã bí mật');
    var btn = $('#connSave'); btn.disabled = true; btn.textContent = 'Đang kiểm tra…';
    var conn = { url: url, token: token };
    var hadLocal = state.tx.length && !state.conn.url;
    api({ action: 'ping' }, conn).then(function (j) {
      state.conn = conn; store.set('conn', conn);
      // Dữ liệu tạo khi chưa kết nối (không phải dữ liệu mẫu cũ) sẽ được gửi lên sheet
      if (hadLocal && confirm('Gửi ' + state.tx.length + ' khoản đang có trên máy này lên Google Sheet?\n(Bấm Huỷ nếu đó chỉ là dữ liệu mẫu.)')) {
        state.queue = state.tx.map(function (t) { return { op: 'upsert', tx: t }; });
      } else { state.queue = []; state.tx = []; }
      save();
      toast('✓ Đã kết nối "' + j.name + '"');
      return sync();
    }).catch(function (e) {
      toast('Không kết nối được: ' + e.message, 'worried');
    }).then(function () { render(); });
  }

  function importOld() {
    if (!confirm('Nhập toàn bộ dữ liệu từ tab "1. Chi tiêu" vào app?\nCó thể chạy lại – các dòng đã nhập sẽ không bị trùng.')) return;
    var btn = $('#importOld'); btn.disabled = true; btn.textContent = 'Đang nhập…';
    flushThen(function () { return api({ action: 'importLegacy' }); }).then(function (j) {
      state.tx = j.tx; if (j.settings) state.settings = Object.assign({}, DEFAULT_SETTINGS, j.settings);
      state.lastSync = Date.now(); save(); alert(j.message);
    }).catch(function (e) { alert('Lỗi: ' + e.message); }).then(render);
  }
  function flushThen(fn) { return (state.queue.length ? sync() : Promise.resolve()).then(fn); }

  $('#txForm').addEventListener('submit', submitForm);
  $('#sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  window.addEventListener('online', function () { scheduleSync(0); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { render(); scheduleSync(0); } });

  /* ================= Boot ================= */
  if (location.hash === '#add') { history.replaceState(null, '', location.pathname); setTimeout(function () { openSheet(null); }, 50); }
  $('#brandMascot').innerHTML = mascot('happy');
  render();
  if (state.conn.url) scheduleSync(0);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });

  // cho test
  window.__costee = { parseAmount: parseAmount, state: state, monthSnapshot: monthSnapshot, mascot: mascot };
})();
