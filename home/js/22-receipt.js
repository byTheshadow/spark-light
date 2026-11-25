/* home/js/22-receipt.js —— 预约小票机（全屏面板）。经典脚本，由 home/page.js 按文件名顺序加载，共享页面作用域。
   用户填的内容一律用 textContent 写入，不用 innerHTML。简化动效（simple）下小票直接显示，不播出纸动画。
   编号、日期、文字版版式来自 17-price.js 的 bookNo / bookDate / bookFrame。 */

var Receipt = (function () {
  'use strict';

  /* ---------- 可调参数 ---------- */
  var STEP_PX = 18;      // 每一格出纸多少像素
  var STEP_MS = 70;      // 每一格间隔多少毫秒
  var WARMUP_MS = 450;   // 开始出纸前的预热时间

  var $ = function (id) { return document.getElementById('rc-' + id); };
  var ov = document.getElementById('rcp');
  var printer = $('printer'), device = $('device');
  var win = $('paperWindow'), receipt = $('receipt');
  var lcdText = $('lcdText'), lcdBars = $('lcdBar').children;
  var inName = $('inName'), inItem = $('inItem'), inTime = $('inTime'), inNote = $('inNote'), inContact = $('inContact');

  var state = { ticket: null, draftNo: null, printing: false, timer: null };

  /* ---------- 简化动效 ---------- */
  function isReduced() { return typeof simple !== 'undefined' && !!simple; }
  function applyReduce() {
    ov.classList.toggle('rc-reduce', isReduced());
    if (isReduced() && state.printing) finish();
  }

  /* ---------- 预约项目：从 data/services.json（DATA.pricing）生成，价格只在那里写一份 ---------- */
  function buildItems() {
    var sel = inItem;
    if (sel.getAttribute('data-built')) return;
    var other = sel.querySelector('option[value="other"]');
    (window.DATA && DATA.pricing ? DATA.pricing : []).forEach(function (d) {
      if (d.pending || !d.items || !d.items.length) return;
      if (d.id === 'ai') {   // AI 内容默认被马赛克遮着，这里只给一个入口，具体档位让访客在说明里写
        var oa = document.createElement('option');
        oa.value = 'ai'; oa.textContent = d.title + '（具体档位在说明里写清楚）';
        sel.insertBefore(oa, other); return;
      }
      var g = document.createElement('optgroup'); g.label = d.title;
      d.items.forEach(function (it) {
        var o = document.createElement('option');
        o.value = d.id + ':' + it.n;
        o.textContent = it.n + '　' + it.p + 'r' + (it.u ? ' ' + it.u : '');
        g.appendChild(o);
      });
      sel.insertBefore(g, other);
    });
    sel.setAttribute('data-built', '1');
  }

  /* ---------- 小工具 ---------- */
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) { return bookDate(d); }
  function makeNo() { return bookNo(); }
  function itemText() {
    return inItem.value ? inItem.options[inItem.selectedIndex].text.replace(/\u3000/g, '  ') : '';
  }
  function readForm() {
    return {
      name: inName.value.trim(),
      item: itemText(),
      time: inTime.value.trim(),
      note: inNote.value.trim(),
      contact: inContact.value.trim()
    };
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('rc-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('rc-show'); }, 2200);
  }
  function setLcd(text, progress) {
    lcdText.textContent = text;
    var on = Math.round((progress || 0) * lcdBars.length);
    for (var i = 0; i < lcdBars.length; i++) lcdBars[i].classList.toggle('rc-on', i < on);
  }
  function setMode(mode) {
    printer.classList.remove('rc-printing', 'rc-done', 'rc-error');
    if (mode) printer.classList.add('rc-' + mode);
  }

  /* ---------- 条形码：按编号生成固定图案 ---------- */
  function barPattern(seedStr) {
    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var bars = [], x = 0;
    bars.push([x, 2]); x += 3; bars.push([x, 1]); x += 3;          // 起始符
    for (var k = 0; k < 34; k++) {
      var w = 1 + Math.floor(rnd() * 3);
      bars.push([x, w]);
      x += w + 1 + Math.floor(rnd() * 2);
    }
    bars.push([x, 1]); x += 2; bars.push([x, 2]); x += 2;           // 结束符
    return { bars: bars, total: x };
  }
  function renderBarcode(svg, code) {
    var p = barPattern(code), NS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + p.total + ' 40');
    p.bars.forEach(function (b) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', b[0]); r.setAttribute('y', 0);
      r.setAttribute('width', b[1]); r.setAttribute('height', 40);
      r.setAttribute('fill', '#e7e7ef');
      svg.appendChild(r);
    });
  }

  /* ---------- 把内容写进小票（全部用 textContent） ---------- */
  function fillReceipt(t) {
    $('rNo').textContent = 'NO. ' + t.no;
    $('rDate').textContent = t.date;
    $('rName').textContent = t.name;
    $('rItem').textContent = t.item;
    $('rTime').textContent = t.time || '待商量';
    $('rNote').textContent = t.note || '（无）';
    $('rContact').textContent = t.contact || '未填写';
    $('rCode').textContent = t.no.replace(/-/g, '');
    renderBarcode($('rBarcode'), t.no);
    $('sheetNo').textContent = t.no;
  }

  /* ---------- 表单检查 ---------- */
  function setInvalid(fieldId, msg) {
    var f = $(fieldId);
    f.classList.toggle('rc-invalid', !!msg);
    var h = f.querySelector('.rc-hint');
    if (h) h.textContent = msg || '';
  }
  function validate(d) {
    setInvalid('fName', d.name ? '' : '请填写称呼');
    setInvalid('fItem', d.item ? '' : '请选一个预约项目');
    if (!d.name) { inName.focus(); return 'NEED NAME'; }
    if (!d.item) { inItem.focus(); return 'PICK ITEM'; }
    return '';
  }

  /* ---------- 左右翻页 ---------- */
  var pager = $('pager'), track = $('track'), pages = [$('page1'), $('page2')];
  var cur = 1, sliding = false, slideTimer = null;
  function syncHeight() { if (!sliding) pager.style.height = pages[cur - 1].offsetHeight + 'px'; }
  function goTo(n, after) {
    if (n === cur) { if (after) after(); return; }
    sliding = true;
    pager.style.height = Math.max(pages[0].offsetHeight, pages[1].offsetHeight) + 'px';
    cur = n;
    track.classList.toggle('rc-at2', n === 2);
    $('steps').classList.toggle('rc-at2', n === 2);
    $('step1').classList.toggle('rc-on', n === 1);
    $('step1').classList.toggle('rc-done', n === 2);
    $('step2').classList.toggle('rc-on', n === 2);
    pages.forEach(function (p, i) {
      var on = i === n - 1;
      p.inert = !on;
      p.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    if (ov.scrollTop > 0) ov.scrollTo({ top: 0, behavior: isReduced() ? 'auto' : 'smooth' });
    clearTimeout(slideTimer);
    slideTimer = setTimeout(function () {
      sliding = false;
      syncHeight();
      if (n === 2) $('sideTitle').focus({ preventScroll: true });
      if (after) after();
    }, isReduced() ? 0 : 580);
  }
  pages[1].inert = true;
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(syncHeight);
    pages.forEach(function (p) { ro.observe(p); });
  }
  window.addEventListener('resize', syncHeight);

  /* ---------- 打印流程 ---------- */
  function clearTimer() { if (state.timer) { clearTimeout(state.timer); state.timer = null; } }

  function resetPaper() {
    clearTimer();
    state.printing = false;
    win.classList.remove('rc-open');
    win.style.height = '0px';
    receipt.style.transform = '';
    receipt.classList.remove('rc-hang');
    $('saveBtn').disabled = true;
    $('sideTitle').textContent = '正在打印你的小票';
    $('sideSub').textContent = '纸会一格一格出来，稍等一下。';
    $('printBtn').disabled = false;
    setMode('');
    setLcd('READY', 0);
  }

  function finish() {
    clearTimer();
    state.printing = false;
    device.classList.remove('rc-tick');
    win.style.height = 'auto';
    win.classList.add('rc-open');
    receipt.style.transform = '';
    if (!isReduced()) { receipt.classList.remove('rc-hang'); void receipt.offsetWidth; receipt.classList.add('rc-hang'); }
    setMode('done');
    setLcd('DONE', 1);
    $('saveBtn').disabled = false;
    $('sideTitle').textContent = '小票打印好了';
    $('sideSub').textContent = '可以存成图片留念。想预约，记得把消息发给站主。';
    $('printBtn').disabled = false;
  }

  function startPrint() {
    if (state.printing) return;
    var d = readForm();
    var err = validate(d);
    if (err) { setMode('error'); setLcd(err, 0); return; }

    var now = new Date();
    d.no = state.draftNo || makeNo(now);
    d.date = fmtDate(now);
    state.draftNo = null;
    state.ticket = d;
    fillReceipt(d);
    updateTextPreview();

    resetPaper();
    goTo(2, runPrint);
  }

  function runPrint() {
    if (isReduced()) { finish(); return; }

    state.printing = true;
    $('printBtn').disabled = true;
    setMode('printing');
    setLcd('PRINTING', 0);

    var H = receipt.offsetHeight, h = 0;
    function step() {
      h = Math.min(H, h + STEP_PX);
      win.style.height = h + 'px';
      receipt.style.transform = 'translateY(' + (h - H) + 'px)';
      device.classList.toggle('rc-tick');
      setLcd('PRINTING', h / H);
      if (h < H) state.timer = setTimeout(step, STEP_MS);
      else state.timer = setTimeout(finish, 200);
    }
    state.timer = setTimeout(step, WARMUP_MS);
  }

  $('form').addEventListener('submit', function (e) { e.preventDefault(); startPrint(); });
  $('backBtn').addEventListener('click', function () {
    resetPaper();
    $('sheetNo').textContent = '打印后生成';
    state.ticket = null;
    updateTextPreview();
    goTo(1, function () { inName.focus({ preventScroll: true }); });
  });
  $('clearBtn').addEventListener('click', function () {
    $('form').reset();
    setInvalid('fName', ''); setInvalid('fItem', '');
    updateCount(); updateTextPreview();
    if (!state.printing) setLcd('READY', 0);
  });
  $('feedKnob').addEventListener('click', function () {
    if (state.printing) return;
    var k = this;
    k.style.transform = 'rotate(90deg)';
    setLcd('FEED', 0);
    setTimeout(function () { k.style.transform = ''; if (!state.printing) setLcd(state.ticket ? 'DONE' : 'READY', state.ticket ? 1 : 0); }, 600);
  });

  [inName, inItem].forEach(function (el) {
    el.addEventListener('input', function () {
      setInvalid(el === inName ? 'fName' : 'fItem', '');
      if (printer.classList.contains('rc-error')) { setMode(''); setLcd('READY', 0); }
    });
  });

  /* ---------- 字数 ---------- */
  function updateCount() { $('noteCount').textContent = inNote.value.length + ' / 200'; }
  inNote.addEventListener('input', updateCount);

  /* ---------- 文字版预约消息 ---------- */
  function buildText(t) {
    var body = [
      '你好 Shadow，我想预约 Spark Light：',
      '称呼：' + (t.name || '（未填写）'),
      '项目：' + (t.item || '（未选择）'),
      '时间：' + (t.time || '待商量'),
      '联系：' + (t.contact || '（未填写）'),
      '补充说明：',
      t.note || '（无）'
    ];
    return bookFrame(body, t.no, t.date);
  }
  function currentTextData() {
    var d = readForm();
    if (state.ticket) { d.no = state.ticket.no; d.date = state.ticket.date; }
    else {
      if (!state.draftNo) state.draftNo = makeNo(new Date());
      d.no = state.draftNo; d.date = fmtDate(new Date());
    }
    return d;
  }
  function updateTextPreview() { $('textPreview').textContent = buildText(currentTextData()); }
  [inName, inItem, inTime, inNote, inContact].forEach(function (el) { el.addEventListener('input', updateTextPreview); });
  inItem.addEventListener('change', updateTextPreview);

  function copyText(s) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = s; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  function doCopy() {
    copyText(buildText(currentTextData())).then(function (ok) {
      toast(ok ? '已复制预约消息，记得发给站主' : '复制没成功，请手动选中下方文字复制');
    });
  }
  $('copyBtn').addEventListener('click', doCopy);
  $('copyBtn2').addEventListener('click', doCopy);

  /* ---------- 保存为图片：用 canvas 重新画一张长图 ---------- */
  var F_SERIF = '"Didot","Bodoni 72","Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun",Georgia,serif';
  var F_SANS = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';
  var F_MONO = '"SF Mono","SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace';

  function wrapLines(ctx, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var line = '';
      for (var i = 0; i < para.length; i++) {
        var test = line + para[i];
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = para[i]; }
        else line = test;
      }
      out.push(line);
    });
    return out;
  }
  function spaced(ctx, str, cx, y, gap) {
    var widths = [], total = 0;
    for (var i = 0; i < str.length; i++) { var w = ctx.measureText(str[i]).width; widths.push(w); total += w + (i ? gap : 0); }
    var x = cx - total / 2;
    ctx.textAlign = 'left';
    for (var j = 0; j < str.length; j++) { ctx.fillText(str[j], x, y); x += widths[j] + gap; }
    return total;
  }
  function sparkle(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r);
    ctx.fill();
  }
  function dash(ctx, x0, x1, y) {
    ctx.save(); ctx.strokeStyle = 'rgba(231,231,239,.38)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke(); ctx.restore();
  }

  // 第一遍只量高度（draw=false），第二遍真正画
  function layoutTicket(ctx, t, draw, W) {
    var x0 = 38, x1 = W - 38, cw = x1 - x0, y = 42;
    var SIL = '#e7e7ef', SIL2 = '#9d9dad';
    ctx.textBaseline = 'alphabetic';

    // 品牌
    ctx.font = '20px ' + F_SERIF; ctx.fillStyle = '#f3f3f8';
    y += 20;
    if (draw) {
      var tw = spaced(ctx, 'SPARK LIGHT', W / 2, y, 3.6);
      sparkle(ctx, W / 2 - tw / 2 - 14, y - 7, 5);
      sparkle(ctx, W / 2 + tw / 2 + 14, y - 7, 5);
    }
    ctx.font = '12px ' + F_SANS; ctx.fillStyle = SIL2;
    y += 24; if (draw) spaced(ctx, '预约小票', W / 2, y, 7);

    // 编号与日期
    y += 26; ctx.font = '10.5px ' + F_MONO; ctx.fillStyle = SIL2;
    if (draw) { ctx.textAlign = 'left'; ctx.fillText('NO. ' + t.no, x0, y); ctx.textAlign = 'right'; ctx.fillText(t.date, x1, y); }
    y += 14; if (draw) dash(ctx, x0, x1, y); y += 12;

    function row(k, v) {
      ctx.font = '13px ' + F_SANS;
      var lines = wrapLines(ctx, v, cw - 58);
      y += 18;
      if (draw) {
        ctx.textAlign = 'left';
        ctx.font = '12px ' + F_SANS; ctx.fillStyle = SIL2; spacedLeft(k, x0, y, 2.4);
        ctx.font = '13px ' + F_SANS; ctx.fillStyle = SIL;
        lines.forEach(function (ln, i) { ctx.fillText(ln, x0 + 58, y + i * 20); });
      }
      y += (lines.length - 1) * 20 + 6;
    }
    function spacedLeft(str, x, yy, gap) {
      for (var i = 0; i < str.length; i++) { ctx.fillText(str[i], x, yy); x += ctx.measureText(str[i]).width + gap; }
    }
    row('称呼', t.name);
    row('项目', t.item);
    row('时间', t.time || '待商量');
    y += 4; if (draw) dash(ctx, x0, x1, y); y += 12;

    // 补充说明
    y += 16; ctx.font = '12px ' + F_SANS; ctx.fillStyle = SIL2;
    if (draw) { ctx.textAlign = 'left'; spacedLeft('补充说明', x0, y, 2.4); }
    ctx.font = '13px ' + F_SANS;
    var nl = wrapLines(ctx, t.note || '（无）', cw);
    y += 8;
    nl.forEach(function (ln) { y += 22; if (draw) { ctx.fillStyle = SIL; ctx.fillText(ln, x0, y); } });
    y += 12; if (draw) dash(ctx, x0, x1, y); y += 12;

    row('联系', t.contact || '未填写');
    y += 4; if (draw) dash(ctx, x0, x1, y); y += 16;

    // 六芒星印章
    var sc = 33, scx = x0 + sc, scy = y + sc;
    if (draw) {
      ctx.save(); ctx.translate(scx, scy); ctx.rotate(-14 * Math.PI / 180); ctx.globalAlpha = .9;
      ctx.strokeStyle = '#dcdce6'; var k = sc / 50;
      ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.arc(0, 0, 46 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = .8 * k; ctx.setLineDash([2 * k, 3 * k]); ctx.beginPath(); ctx.arc(0, 0, 40 * k, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 1.4 * k; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -30 * k); ctx.lineTo(26 * k, 15 * k); ctx.lineTo(-26 * k, 15 * k); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 30 * k); ctx.lineTo(-26 * k, -15 * k); ctx.lineTo(26 * k, -15 * k); ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.arc(0, 0, 5 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.font = '10.5px ' + F_SANS; ctx.fillStyle = SIL2; ctx.textAlign = 'left';
      ['纪念小票，不作预约凭证', '本站不保存、不发送任何内容', '预约请主动联系站主'].forEach(function (s, i) {
        ctx.fillText(s, x0 + sc * 2 + 12, scy - 14 + i * 18 + 4);
      });
    }
    y += sc * 2 + 14;

    // 条形码
    if (draw) {
      var p = barPattern(t.no), kx = cw / p.total;
      ctx.fillStyle = SIL;
      p.bars.forEach(function (b) { ctx.fillRect(x0 + b[0] * kx, y, b[1] * kx, 40); });
    }
    y += 40 + 16;
    ctx.font = '10px ' + F_MONO; ctx.fillStyle = SIL2;
    if (draw) spaced(ctx, t.no.replace(/-/g, ''), W / 2, y, 3.2);
    y += 12; if (draw) dash(ctx, x0, x1, y); y += 14;

    // 最后一行：期待您的来访
    y += 18; ctx.font = '16px ' + F_SERIF; ctx.fillStyle = '#f3f3f8';
    if (draw) {
      var lw = spaced(ctx, '期待您的来访', W / 2, y, 6);
      var g1 = ctx.createLinearGradient(x0, 0, W / 2 - lw / 2 - 10, 0);
      g1.addColorStop(0, 'rgba(231,231,239,0)'); g1.addColorStop(1, 'rgba(231,231,239,.55)');
      ctx.fillStyle = g1; ctx.fillRect(x0, y - 6, (W / 2 - lw / 2 - 10) - x0, 1);
      var g2 = ctx.createLinearGradient(x1, 0, W / 2 + lw / 2 + 10, 0);
      g2.addColorStop(0, 'rgba(231,231,239,0)'); g2.addColorStop(1, 'rgba(231,231,239,.55)');
      ctx.fillStyle = g2; ctx.fillRect(W / 2 + lw / 2 + 10, y - 6, x1 - (W / 2 + lw / 2 + 10), 1);
    }
    y += 22;
    return y + 4 + 1 + 14; // 内框留白 + 双框 + 外边距
  }

  function drawTicketImage(t) {
    var W = 300, M = 28, S = 3, TEAR = 8;
    var probe = document.createElement('canvas').getContext('2d');
    var bodyH = Math.ceil(layoutTicket(probe, t, false, W));
    var cv = document.createElement('canvas');
    cv.width = (W + M * 2) * S; cv.height = (bodyH + TEAR + M * 2) * S;
    var ctx = cv.getContext('2d');
    ctx.scale(S, S);

    // 背景：淡紫淡青淡粉
    var bg = ctx.createLinearGradient(0, 0, W + M * 2, bodyH + M * 2);
    bg.addColorStop(0, '#ece6ff'); bg.addColorStop(.5, '#ddf4f1'); bg.addColorStop(1, '#fde7ef');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W + M * 2, bodyH + TEAR + M * 2);

    ctx.translate(M, M);
    // 小票本体 + 锯齿撕口
    ctx.save();
    ctx.shadowColor = 'rgba(40,20,80,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#0c0c0f';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, bodyH);
    for (var x = W; x > 0; x -= 14) { ctx.lineTo(Math.max(x - 7, 0), bodyH + TEAR); ctx.lineTo(Math.max(x - 14, 0), bodyH); }
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // 双层内框
    ctx.strokeStyle = 'rgba(231,231,239,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(14.5, 14.5, W - 29, bodyH - 29);
    ctx.strokeStyle = 'rgba(231,231,239,.25)';
    ctx.strokeRect(19.5, 19.5, W - 39, bodyH - 39);

    layoutTicket(ctx, t, true, W);
    return cv;
  }

  $('saveBtn').addEventListener('click', function () {
    if (!state.ticket) return;
    var cv = drawTicketImage(state.ticket);
    var name = 'SparkLight-预约小票-' + state.ticket.no + '.png';
    cv.toBlob(function (blob) {
      if (!blob) { toast('图片生成失败，请再试一次'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      setLcd('SAVED', 1);
      toast('小票图片已保存');
    }, 'image/png');
  });


  /* ---------- 打开与关闭 ---------- */
  function isOpen() { return ov.classList.contains('rc-on'); }
  function open() {
    buildItems();
    applyReduce();
    if (cur === 2) { resetPaper(); state.ticket = null; $('sheetNo').textContent = '打印后生成'; goTo(1); }
    updateCount(); updateTextPreview();
    ov.inert = false;
    ov.classList.add('rc-on');
    ov.scrollTop = 0;
    syncHeight();
    if (window.SLSpark) SLSpark.burst();
    setTimeout(function () { if (isOpen()) inName.focus({ preventScroll: true }); }, 120);
  }
  function close() {
    if (!isOpen()) return;
    clearTimer();
    state.printing = false;
    ov.classList.remove('rc-on');
    ov.inert = true;
  }
  $('close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);
  ['bookSlip', 'slipBtn'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', function () { if (window.Sheets) Sheets.close(); open(); });
  });

  updateCount();
  updateTextPreview();
  return { open: open, close: close, isOpen: isOpen };
})();
