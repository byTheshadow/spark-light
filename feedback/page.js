/* 返图与反馈页的入口脚本。本页只依赖 core/、data/ 和 feedback/ 里的模块，不依赖其他页面。
   组成：封面里的电话（phone.js）→ 接通后的来电单（memo.js）→ 公开的来电记录（log.js）。
   后端接口集中在 api.js；目前没有后端，见 api.js 顶部说明。
   数据：data/feedback.json（线路与公开的留言），图片在 assets/feedback/。 */
import { loadData } from '../core/data.js';
import { h, clear, root, errorBox } from '../core/util.js';
import { renderStub } from '../core/page-stub.js';
import { createLoop, lcg } from '../core/raf.js';
import { createApi } from './api.js';
import { createPhone } from './phone.js';
import { createMemo } from './memo.js';
import { createLog } from './log.js';

renderStub('feedback');
const $ = (id) => document.getElementById(id);
const loop = createLoop();
const FALLBACK_TINTS = ['200,190,255', '150,214,206', '236,190,210', '230,210,160', '170,200,240'];
const TINTS = { divination: '200,190,255', vibecoding: '150,214,206', tuning: '176,222,214', ai: '236,190,210' };

/* ---------- 提示条 ---------- */
let toastEl, toastT;
function toast(text) {
  if (!toastEl) { toastEl = h('div', { class: 'sl-toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastEl); }
  toastEl.textContent = text; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
}

/* ---------- 夜空：随机星点与四角星（固定种子，每次刷新位置不变） ---------- */
(function sky() {
  const r = lcg(7);
  [['sky1', 60, 1.4, 10], ['sky2', 26, 2.4, 6]].forEach((c) => {
    const box = $(c[0]); if (!box) return;
    for (let i = 0; i < c[1]; i++) { const b = h('b'); const s = .6 + r() * c[2]; b.style.cssText = 'left:' + (r() * 100) + '%;top:' + (r() * 100) + '%;width:' + s + 'px;height:' + s + 'px;opacity:' + (.2 + r() * .6); box.appendChild(b); }
    for (let j = 0; j < c[3]; j++) { const k = h('i'); k.style.cssText = 'left:' + (r() * 100) + '%;top:' + (r() * 100) + '%;--s:' + (4 + r() * 7) + 'px;--t:' + (3 + r() * 4) + 's;--dl:' + (-r() * 4) + 's'; box.appendChild(k); }
  });
})();

/* ---------- 数据 ---------- */
const cfgP = loadData('feedback').catch((e) => { console.warn('[Spark Light] ' + (e.file || '') + ' 读取失败：' + e.message); return null; });
const consentP = loadData('notice').then((n) => (n && n.consent && typeof n.consent.text === 'string' && n.consent.text.trim()) || null).catch(() => null);

function normalizeLines(cfg) {
  const raw = cfg && Array.isArray(cfg.lines) ? cfg.lines : [];
  return raw.filter((l) => l && l.id).map((l, k) => ({ id: String(l.id), name: l.name || String(l.id), tint: TINTS[l.id] || FALLBACK_TINTS[k % FALLBACK_TINTS.length] }));
}
function normalizeItems(cfg, lines) {
  const raw = cfg && Array.isArray(cfg.items) ? cfg.items : [];
  const knownLine = (id) => lines.some((l) => l.id === id);
  return raw.filter((i) => i && /^\d{4}-\d{2}-\d{2}$/.test(String(i.date || '')) && (i.text || (Array.isArray(i.images) && i.images.length)))
    .map((i, k) => {
      if (!knownLine(i.line)) lines.push({ id: String(i.line), name: String(i.line), tint: FALLBACK_TINTS[lines.length % FALLBACK_TINTS.length] });
      return {
        id: String(i.id || 'f' + k), line: String(i.line), date: i.date, name: i.name ? String(i.name) : null, text: i.text ? String(i.text) : null,
        imgs: (Array.isArray(i.images) ? i.images : []).map((f) => {
          if (f && typeof f === 'object' && typeof f.src === 'string') return { src: f.src, ar: Number(f.ar) || 1.3 };
          if (typeof f === 'string' && f) {
            const isUrl = /^(?:https?:|data:|blob:)/i.test(f);
            return { src: isUrl ? f : (root + 'assets/feedback/' + encodeURIComponent(f)), ar: 1.3 };
          }
          return null;
        }).filter(Boolean)
      };
    });
}

(async function main() {
  /* 电话先做出来，不等数据：数据读不到时电话也能用 */
  let memo = null, phone = null, lg = null, api = createApi(null), itemCount = 0;
  const apiP = cfgP.then((cfg) => { api = createApi(cfg); return api; });

  phone = createPhone({
    verify: async (code) => (await apiP).verify(code),
    onConnected: () => { if (memo) memo.open($('bCall'), phone.handsetRect()); }
  }, loop);

  loop.start();

  const cfg = await cfgP;
  const lines = normalizeLines(cfg);
  api = createApi(cfg);
  const remoteItems = await api.fetchApproved();
  const mergedCfg = cfg ? Object.assign({}, cfg, { items: remoteItems.concat(Array.isArray(cfg.items) ? cfg.items : []) }) : null;
  const items = normalizeItems(mergedCfg, lines);
  itemCount = items.length;
  const consentText = await consentP;

  if (api.preview) { $('proto').hidden = false; phone.setMode('预览模式：任意 4 位以上的数字都能接通，不会发出任何内容'); }
  else if (!api.enabled) phone.setMode('留言通道暂未开放');

  memo = createMemo({
    lines: lines.length ? lines : [{ id: 'other', name: '其他', tint: '200,200,210' }],
    consentText, api, preview: api.preview,
    getNo: () => itemCount + 1,
    toast,
    onSent: (m) => { itemCount++; if (lg) lg.addPending(m); toast('留言已寄出，审核通过后公开'); },
    onClosed: (sent) => phone.hangUp(sent)
  });
  loop.add((now) => memo.tick(now));

  const views = $('views'), ctrl = $('ctrl');
  if (!cfg) {
    clear(views); views.appendChild(errorBox('来电记录读取失败', '请检查 data/feedback.json 是否存在、格式是否正确。'));
  } else {
    lg = createLog({ views, ctrl, lines, items, loop });
    lg.start();
  }
  addEventListener('pagehide', () => { if (lg) lg.releasePending(); if (phone) phone.destroy(); });
  loop.start();
})().catch((e) => { console.error('[Spark Light] 返图页出错：', e); });
