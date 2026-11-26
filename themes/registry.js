/* 主题注册表。pages 是该主题给个别页面单独准备的皮肤（页面名对应 <html data-page>）。新增主题：在 themes/ 下新建文件夹写好 theme.css，再在这里加一行，status 改为 'ready' 即可。
   chrome 是这套主题用的外壳形态：'pill'（顶部正中胶囊，展开成面板）或 'bar'（原来的通栏顶栏）。主界面始终用它自己的顶栏与悬浮球，不受影响。
   内容数据（data/*.json）完全不用动。 */
window.SL_THEMES = [
  { id: 't1-starfield', name: '白黑弥散星空', en: 'monochrome starfield', css: 'themes/t1-starfield/theme.css', pages: { home: 'themes/t1-starfield/home.css' }, themeColor: '#f8f8f9', chrome: 'pill', status: 'ready' },
  { id: 't2-journal',   name: '梦女手帐 · 草莓牛奶', en: 'strawberry dream journal', css: 'themes/t2-journal/theme.css', pages: { home: 'themes/t2-journal/home.css' }, themeColor: '#fbf3f2', chrome: 'pill', status: 'ready' },
  { id: 't3-arcade',    name: '像素街机',     en: 'pixel arcade',         css: 'themes/t3-arcade/theme.css',    pages: { home: 'themes/t3-arcade/home.css' }, themeColor: '#101018', chrome: 'pill', status: 'ready' }
];
