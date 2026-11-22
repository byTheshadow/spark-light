/* 主题注册表。新增主题：在 themes/ 下新建文件夹写好 theme.css，再在这里加一行，status 改为 'ready' 即可。
   内容数据（data/*.json）完全不用动。 */
window.SL_THEMES = [
  { id: 't1-starfield', name: '白黑弥散星空', en: 'monochrome starfield', css: 'themes/t1-starfield/theme.css', themeColor: '#f8f8f9', status: 'ready' },
  { id: 't2-journal',   name: '梦女手帐',     en: 'dream journal',        css: 'themes/t2-journal/theme.css',   themeColor: '#efe6da', status: 'planned' },
  { id: 't3-arcade',    name: '像素街机',     en: 'pixel arcade',         css: 'themes/t3-arcade/theme.css',    themeColor: '#101018', status: 'planned' }
];
