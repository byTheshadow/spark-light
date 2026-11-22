/* 统一读取 data/*.json。每个页面只读自己需要的文件，某个文件出错只影响用到它的区块。
   以下划线开头的键（如 "_说明"）是写给站主看的备注，程序不会使用。 */
import { root } from './util.js';

export class DataError extends Error {
  constructor(name, msg) { super(msg); this.name = 'DataError'; this.file = 'data/' + name + '.json'; }
}

const cache = new Map();

export function loadData(name) {
  if (!cache.has(name)) {
    const p = fetch(root + 'data/' + name + '.json', { cache: 'no-cache' })
      .then(async (r) => {
        if (!r.ok) throw new DataError(name, '找不到文件（HTTP ' + r.status + '）');
        const text = await r.text();
        try { return JSON.parse(text); }
        catch (e) { throw new DataError(name, 'JSON 格式有误：' + e.message + '。常见原因：多了或少了逗号、引号不是英文半角。'); }
      })
      .catch((e) => {
        cache.delete(name); // 下次可重试
        if (e instanceof DataError) throw e;
        throw new DataError(name, '读取失败，请检查网络后刷新。');
      });
    cache.set(name, p);
  }
  return cache.get(name);
}
