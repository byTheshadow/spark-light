/* 返图与反馈页和后端之间的接口层（已对接 Spark Light 全站二合一云端守门员 Worker）。
   - 当 data/feedback.json 的 backend.enabled 为 true 且填了 endpoint 时：
     1) verify(code) 会请求云端守门员 /feedback/verify 校验通用口令（默认 20261124，可在 Worker 变量 FEEDBACK_PASSCODE 随时改）。
     2) submit(payload) 会自动将单主选择的图片在浏览器内无损缩放压缩为轻巧的 WebP 格式（最大边 1080px），再连同留言发往 /feedback/submit，进入待审核队列。
     3) list() 会从 /feedback/list 拉取站主已审核通过的公开返图。
   - 预览模式（地址后加 ?preview=1）：任意 4 位以上的口令都能接通，提交只在本次页面里模拟。 */

export const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 将单主上传的图片压缩为轻巧清晰的 WebP DataURL（单张约 40KB~80KB），无需付费图床即可直接存入 Cloudflare D1 */
function compressImageFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxSide = 1080;
      let w = img.naturalWidth || 800;
      let h = img.naturalHeight || 600;
      const ar = Number((w / Math.max(1, h)).toFixed(2)) || 1.3;
      if (w > maxSide || h > maxSide) {
        if (w >= h) { h = Math.round((h * maxSide) / w); w = maxSide; }
        else { w = Math.round((w * maxSide) / h); h = maxSide; }
      }
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let dataUrl = cv.toDataURL('image/webp', 0.78);
      if (dataUrl.length > 320000) {
        dataUrl = cv.toDataURL('image/jpeg', 0.68);
      }
      resolve({ src: dataUrl, ar });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function createApi(cfg) {
  const backend = (cfg && cfg.backend) || {};
  const endpoint = String(backend.endpoint || '').trim().replace(/\/+$/, '');
  const enabled = !!(backend.enabled === true && endpoint);
  let lastVerifiedCode = '';

  return {
    enabled,
    endpoint,
    preview: PREVIEW,

    /** 校验通用拨号口令。返回 { ok, kind?, message? } */
    async verify(code) {
      const clean = String(code || '').trim();
      if (PREVIEW) {
        lastVerifiedCode = clean;
        return { ok: clean.length >= 4 };
      }
      if (!enabled) {
        return { ok: false, kind: 'closed', message: '留言通道暂未开放，开放后再来拨号' };
      }
      try {
        const res = await fetch(endpoint + '/feedback/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: clean })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.ok) {
          lastVerifiedCode = clean;
          return { ok: true };
        }
        return { ok: false, message: (data && data.message) || '口令没有接通，核对后重拨' };
      } catch (e) {
        return { ok: false, kind: 'closed', message: '暂时联系不上留言台，请稍后再试' };
      }
    },

    /** 提交留言与压缩后的返图。payload：{ line, name, text, files[], consent } */
    async submit(payload) {
      if (PREVIEW) { await wait(900); return { ok: true, pending: true }; }
      if (!enabled) throw new Error('留言通道暂未开放');

      const rawFiles = Array.isArray(payload.files) ? payload.files.slice(0, 4) : [];
      const compressed = (await Promise.all(rawFiles.map(compressImageFile))).filter(Boolean);

      const res = await fetch(endpoint + '/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: lastVerifiedCode,
          line: payload.line,
          name: payload.name,
          text: payload.text,
          images: compressed,
          consent: !!payload.consent
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || !data.ok) {
        throw new Error((data && data.message) || '提交没有成功，请稍后再试');
      }
      return { ok: true, pending: true, id: data.id };
    },

    /** 拉取云端已审核通过的公开返图列表 */
    async fetchApproved() {
      if (!enabled) return [];
      try {
        const res = await fetch(endpoint + '/feedback/list', { cache: 'no-cache' });
        const data = await res.json().catch(() => ({}));
        return (res.ok && data && Array.isArray(data.items)) ? data.items : [];
      } catch (e) {
        return [];
      }
    }
  };
}
