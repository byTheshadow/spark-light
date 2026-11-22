/* 分页占位：阶段 1 里四个子页面共用。页面标题、说明从 data/site.json 读取。
   后续阶段各页面会换成自己的 page.js，不再用本文件。 */
import { loadData } from './data.js';
import { h, clear, errorBox } from './util.js';

export async function renderStub(pageId) {
  const title = document.getElementById('page-title');
  const lede = document.getElementById('page-lede');
  try {
    const site = await loadData('site');
    const n = site.nav.find((x) => x.id === pageId);
    if (n) {
      title.textContent = n.title;
      lede.textContent = n.desc || '';
      document.title = n.title + ' · ' + site.name;
    }
  } catch (e) {
    const slot = document.getElementById('page-body');
    if (slot) { clear(slot); slot.appendChild(errorBox('页面信息读取失败', e.message)); }
  }
}
