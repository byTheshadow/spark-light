/* 返图与反馈页和后端之间的接口层。目前（阶段 5 之前）没有后端：
   - 正常访问：口令无法校验，拨号后会提示“留言通道暂未开放”，不会发送任何内容。
   - 预览模式（地址后加 ?preview=1）：任意 4 位以上的口令都能接通，提交只在本次页面里模拟，不会发出，刷新就没了。
   阶段 5 接入真实后端时，只需要改下面两个函数，页面其他部分不用动。
   重要：口令校验必须由后端完成，前端不能写死口令或在前端比对。 */

export const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createApi(cfg) {
  const enabled = !!(cfg && cfg.backend && cfg.backend.enabled === true);
  return {
    enabled,
    preview: PREVIEW,
    /** 校验口令。返回 { ok, kind?, message? }。kind 为 'closed' 表示通道没开放（不是口令错） */
    async verify(code) {
      if (PREVIEW) return { ok: String(code).length >= 4 };
      if (!enabled) return { ok: false, kind: 'closed', message: '留言通道暂未开放，开放后再来拨号' };
      /* 阶段 5：在这里请求后端校验口令 */
      return { ok: false, kind: 'closed', message: '留言通道还没接好，请稍后再试' };
    },
    /** 提交留言。payload：{ line, name, text, files[], consent } 。返回 { ok, pending } */
    async submit(payload) {
      if (PREVIEW) { await wait(900); return { ok: true, pending: true }; }
      /* 阶段 5：在这里把内容与图片交给后端，状态为待审核 */
      throw new Error('留言通道还没接好');
    }
  };
}
