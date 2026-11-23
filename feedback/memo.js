/* 接通后的来电单：客人在这里选项目、写昵称、写留言、附返图、勾选授权，然后寄出或挂断。
   所有可见文字用 textContent 写入。图片用临时地址预览，关闭、寄出或离开页面时立即释放。
   提交交给 api.submit（阶段 5 由后端接管，状态为待审核）。 */
import { h } from '../core/util.js';
import { isSimple, pad2, buzz } from '../core/raf.js';

const MAXIMG = 4;                 /* 预览值。正式的数量与单张大小上限，等返图后端选定后按它的规则来定 */
const MAXBYTES = 8 * 1024 * 1024; /* 预览值，同上 */
const MAXTEXT = 500;              /* 预览值，同上 */

const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 6.4 4.8 9 10 3"/></svg>';
const PLUS = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>';
const XSVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 2l8 8M10 2 2 10"/></svg>';
const HANG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.2 14.6c4.7-4.4 12.9-4.4 17.6 0 .5.5.5 1.2.1 1.7l-1.6 1.8c-.4.4-1 .5-1.5.2l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-1.6c-2.3-.7-4.5-.7-6.8 0v1.6c0 .5-.2.9-.6 1.1l-2.3 1.3c-.5.3-1.1.2-1.5-.2l-1.6-1.8c-.4-.5-.4-1.2.1-1.7z"/></svg>';
function html(tag, cls, markup) { const e = h(tag, { class: cls }); e.innerHTML = markup; return e; } /* markup 只用上面写死的常量 */

export function createMemo(o) {
  /* o: { lines:[{id,name,tint}], consentText, api, preview, getNo(), onSent(msg), onClosed(sent), toast(text) } */
  let choice = null, anon = false, files = [], closing = false, isOpen = false, opener = null, t0 = 0, lvl = .2, lastSec = -1, lastMic = 0, sending = false;

  const mNo = h('b'), mTime = h('time', null, '00:00');
  const top = h('div', { class: 'mh-top' }, h('span', { class: 'mh-no' }, '来电单 No. ', mNo), h('span', { class: 'mh-live' }, h('i'), '通话中 ', mTime));
  const mTitle = h('h2', { id: 'mTitle', tabindex: '-1' }, '来电留言');
  const mic = h('div', { class: 'mic', 'aria-hidden': 'true' });
  for (let i = 0; i < 22; i++) mic.appendChild(h('b'));
  const mh = h('div', { class: 'mh-t' }, h('div', null, mTitle, h('p', null, 'while you were on the line')), mic);
  const slip = h('ul', { class: 'slip', 'aria-hidden': 'true' }, h('li', null, '已接通'), h('li', { class: 'off' }, '请回电'), h('li', null, '留言如下'));
  const note = h('p', { class: 'm-note' }, '留言会先进入审核，通过后公开。');
  const previewNote = o.preview ? h('p', { class: 'm-note m-prev' }, '预览模式：这张来电单不会发出任何内容。') : null;

  /* 项目 */
  const eLine = h('span', { class: 'err', role: 'alert' });
  const fLines = h('div', { class: 'chks', role: 'radiogroup', 'aria-labelledby': 'flLine' });
  o.lines.forEach((L) => {
    const b = h('button', { class: 'chk', type: 'button', role: 'radio', 'aria-checked': 'false', 'data-id': L.id });
    b.style.setProperty('--tint', L.tint);
    b.append(html('span', 'sq', CHECK), h('span', null, L.name));
    b.addEventListener('click', () => {
      choice = L.id;
      fLines.querySelectorAll('.chk').forEach((k) => k.setAttribute('aria-checked', String(k === b)));
      eLine.textContent = ''; lvl = .8;
    });
    fLines.appendChild(b);
  });
  const secLine = h('div', { class: 'mf' }, h('div', { class: 'mf-l', id: 'flLine' }, '这次的项目'), fLines, eLine);

  /* 昵称 */
  const fName = h('input', { class: 'ul', id: 'fName', type: 'text', maxlength: '16', placeholder: '起一个昵称', autocomplete: 'off' });
  const sw = h('i'); const swWrap = h('span', { class: 'sw' }, sw);
  const fAnon = h('button', { class: 'anon-sw', type: 'button', role: 'switch', 'aria-checked': 'false' }, h('span', null, '不留姓名'), swWrap);
  fAnon.addEventListener('click', () => {
    anon = !anon; fAnon.setAttribute('aria-checked', String(anon)); fName.disabled = anon;
    fName.placeholder = anon ? '将显示为 匿名来电' : '起一个昵称';
  });
  fName.addEventListener('input', () => { lvl = 1; });
  const secName = h('div', { class: 'mf' }, h('label', { class: 'mf-l', for: 'fName' }, '来电人'), h('div', { class: 'name-row' }, fName, fAnon));

  /* 留言 */
  const fText = h('textarea', { class: 'lined', id: 'fText', maxlength: String(MAXTEXT), placeholder: '写下这一次的感受' });
  const fCnt = h('span', { class: 'cnt' }, '0 / ' + MAXTEXT);
  const eText = h('span', { class: 'err', role: 'alert' });
  fText.addEventListener('input', () => { lvl = 1; fCnt.textContent = fText.value.length + ' / ' + MAXTEXT; if (fText.value.trim()) eText.textContent = ''; });
  const secText = h('div', { class: 'mf' }, h('label', { class: 'mf-l', for: 'fText' }, '留言 ', h('span', { class: 'opt' }, '字数上限为预览值')), fText, fCnt, eText);

  /* 返图 */
  const ups = h('div', { class: 'ups' });
  const fFile = h('input', { class: 'sl-visually-hidden', id: 'fFile', type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, tabindex: '-1' });
  function releaseFiles() { files.forEach((f) => URL.revokeObjectURL(f.url)); files = []; }
  function renderUps() {
    ups.textContent = '';
    files.forEach((f, i) => {
      const u = h('div', { class: 'up' }, h('img', { src: f.url, alt: '' }));
      u.style.setProperty('--r', f.r + 'deg');
      const x = html('button', '', XSVG); x.type = 'button'; x.setAttribute('aria-label', '移除这张');
      x.addEventListener('click', () => { URL.revokeObjectURL(f.url); files.splice(i, 1); renderUps(); });
      u.appendChild(x); ups.appendChild(u);
    });
    if (files.length < MAXIMG) {
      const a = html('button', 'add', PLUS); a.type = 'button'; a.appendChild(h('span', null, '添加图片'));
      a.addEventListener('click', () => fFile.click());
      ups.appendChild(a);
    }
  }
  fFile.addEventListener('change', () => {
    const arr = Array.from(fFile.files || []).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    const big = arr.filter((f) => f.size > MAXBYTES);
    const ok = arr.filter((f) => f.size <= MAXBYTES);
    const room = MAXIMG - files.length;
    if (big.length) o.toast('有图片太大，没有加进来');
    else if (ok.length > room) o.toast('最多 ' + MAXIMG + ' 张，多出的没有加进来');
    ok.slice(0, room).forEach((f) => files.push({ file: f, url: URL.createObjectURL(f), r: ((Math.random() - .5) * 6).toFixed(1) }));
    fFile.value = ''; renderUps();
  });
  const secImg = h('div', { class: 'mf' }, h('div', { class: 'mf-l' }, '附上返图 ', h('span', { class: 'opt' }, '可不传')), ups, fFile,
    h('p', { class: 'hint' }, '预览中最多 ' + MAXIMG + ' 张，支持 jpg、png、webp。正式的数量与单张大小上限，等返图后端选定后按它的规则来定。'));

  /* 授权 */
  const eOk = h('span', { class: 'err', role: 'alert' });
  const consentLine = h('span', null, '我同意这条留言和返图在本站公开展示。');
  if (o.consentText) consentLine.appendChild(h('span', { class: 'cs-text' }, o.consentText));
  else consentLine.appendChild(h('span', { class: 'ph' }, '授权说明原文待站主在营业须知里确定'));
  const fOk = h('button', { class: 'ck', type: 'button', role: 'checkbox', 'aria-checked': 'false' }, html('span', 'box', CHECK), consentLine);
  fOk.addEventListener('click', () => { const v = fOk.getAttribute('aria-checked') !== 'true'; fOk.setAttribute('aria-checked', String(v)); if (v) eOk.textContent = ''; });
  const secOk = h('div', { class: 'mf' }, fOk, eOk);

  /* 操作 */
  const hang = html('button', 'hangb', HANG); hang.type = 'button'; hang.setAttribute('aria-label', '挂断，不寄出');
  const spin = h('span', { class: 'spin' }), lb = h('span', { class: 'lb' }, '寄出留言');
  const send = h('button', { class: 'btn send', type: 'button' }, spin, lb);
  const act = h('div', { class: 'm-act' }, hang, send);

  const memo = h('section', { class: 'memo', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mTitle' }, top, mh, slip, note, previewNote, secLine, secName, secText, secImg, secOk, act);
  const scrim = h('div', { class: 'c-scrim' });
  const wrap = h('div', { class: 'c-wrap' }, h('span', { class: 'pad', style: '--r:-2.6deg', 'aria-hidden': 'true' }), h('span', { class: 'pad', style: '--r:2deg', 'aria-hidden': 'true' }), memo);
  const callEl = h('div', { class: 'call', 'aria-hidden': 'true' }, scrim, wrap);
  document.body.appendChild(h('div', { class: 'fbp' }, callEl)); /* 外面套一层 fbp，样式只在本页生效 */
  renderUps();

  function resetForm() {
    choice = null; fLines.querySelectorAll('.chk').forEach((k) => k.setAttribute('aria-checked', 'false'));
    anon = false; fAnon.setAttribute('aria-checked', 'false'); fName.disabled = false; fName.placeholder = '起一个昵称'; fName.value = '';
    fText.value = ''; fCnt.textContent = '0 / ' + MAXTEXT; fOk.setAttribute('aria-checked', 'false');
    eLine.textContent = eText.textContent = eOk.textContent = '';
    releaseFiles(); renderUps();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(memo.querySelectorAll('button,input,textarea,[tabindex]')).filter((x) => x.tabIndex >= 0 && !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
  }

  function open(from, handsetRect) {
    if (isOpen) return;
    isOpen = true; closing = false; opener = from || document.activeElement;
    mNo.textContent = String(o.getNo()).padStart(4, '0');
    callEl.classList.add('on'); callEl.setAttribute('aria-hidden', 'false'); document.body.classList.add('sl-lock'); memo.scrollTop = 0;
    t0 = Date.now(); lastSec = -1;
    if (window.SLSpark) window.SLSpark.burst();
    if (!isSimple() && memo.animate && handsetRect) {
      const mr = memo.getBoundingClientRect();
      const dx = handsetRect.left + handsetRect.width / 2 - (mr.left + mr.width / 2), dy = handsetRect.top + handsetRect.height / 2 - (mr.top + mr.height / 2);
      memo.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.14) rotate(-28deg)', opacity: 0 },
        { offset: .55, transform: 'translate(0,-12px) scale(1.02) rotate(2.5deg)', opacity: 1 },
        { offset: .8, transform: 'translate(0,3px) scale(.995) rotate(-.8deg)', opacity: 1 },
        { transform: 'none', opacity: 1 }], { duration: 950, easing: 'cubic-bezier(.22,.8,.18,1)' });
    }
    document.addEventListener('keydown', onKey);
    setTimeout(() => { if (isOpen) mTitle.focus({ preventScroll: true }); }, isSimple() ? 0 : 520);
  }

  function close(sent) {
    if (!isOpen || closing) return;
    closing = true;
    document.removeEventListener('keydown', onKey);
    function done() {
      isOpen = false; closing = false;
      callEl.classList.remove('on', 'closing'); callEl.setAttribute('aria-hidden', 'true'); document.body.classList.remove('sl-lock');
      if (!sent) { releaseFiles(); renderUps(); }
      if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* 元素已不在页面 */ } }
      o.onClosed(!!sent);
    }
    if (isSimple() || !memo.animate) { done(); return; }
    callEl.classList.add('closing');
    const a = memo.animate(sent
      ? [{ transform: 'none', opacity: 1 }, { offset: .3, transform: 'translateY(-16px) rotate(-2deg) scale(.98)', opacity: 1 }, { transform: 'translate(0,72vh) scale(.22) rotate(18deg)', opacity: 0 }]
      : [{ transform: 'none', opacity: 1 }, { transform: 'translate(0,46vh) rotate(8deg)', opacity: 0 }],
      { duration: sent ? 820 : 520, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
    a.onfinish = () => { done(); a.cancel(); };
  }

  hang.addEventListener('click', () => close(false));
  scrim.addEventListener('click', () => close(false));

  send.addEventListener('click', async () => {
    if (sending) return;
    let ok = true;
    if (!choice) { eLine.textContent = '选一下这次的项目'; ok = false; }
    if (!fText.value.trim() && !files.length) { eText.textContent = '留言还空着，写一句或附一张图都可以'; ok = false; }
    if (fOk.getAttribute('aria-checked') !== 'true') { eOk.textContent = '勾选同意后才能寄出'; ok = false; }
    if (!ok) {
      buzz([20, 30, 20]);
      const first = memo.querySelector('.err:not(:empty)');
      if (first && first.parentNode) first.parentNode.scrollIntoView({ block: 'center', behavior: isSimple() ? 'auto' : 'smooth' });
      return;
    }
    sending = true; send.classList.add('go'); lb.textContent = '寄出中';
    const payload = { line: choice, name: anon ? null : (fName.value.trim() || null), text: fText.value.trim(), files: files.map((f) => f.file), consent: true };
    try {
      const res = await o.api.submit(payload);
      if (!res || !res.ok) throw new Error('提交没有成功');
      const d = new Date(), ds = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      /* 预览模式：把内容留在本页，图片的临时地址交给卡片使用，页面离开时统一释放 */
      const msg = { id: 'p' + Date.now(), line: payload.line, date: ds, name: payload.name, text: payload.text, imgs: files.map((f) => ({ src: f.url, ar: 1 })), pending: true, fresh: true };
      files = [];                       /* 地址已交给 msg，不在这里释放 */
      resetForm();
      sending = false; send.classList.remove('go'); lb.textContent = '寄出留言';
      close(true);
      o.onSent(msg);
    } catch (e) {
      sending = false; send.classList.remove('go'); lb.textContent = '寄出留言';
      o.toast('没有寄出去：' + (e && e.message ? e.message : '请稍后再试'));
    }
  });

  addEventListener('pagehide', releaseFiles);

  return {
    open, close,
    isOpen: () => isOpen,
    /* 由页面的动画循环调用：通话计时与麦克风条（不用定时器，切后台时自然停止） */
    tick(now) {
      if (!isOpen) return;
      const s = Math.floor((Date.now() - t0) / 1000);
      if (s !== lastSec) { lastSec = s; mTime.textContent = pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); }
      const gap = isSimple() ? 600 : 110;
      if (now - lastMic < gap) return;
      lastMic = now; lvl = Math.max(.14, lvl * .86);
      const bs = mic.children;
      for (let i = 0; i < bs.length; i++) bs[i].style.setProperty('--v', (lvl * (.35 + Math.random() * .65) * (.6 + .4 * Math.sin(i * .5))).toFixed(2));
    }
  };
}
