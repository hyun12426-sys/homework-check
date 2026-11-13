// homework-check.js 를 북마크 버튼으로 만들어 index.html 에 넣는다.  실행: node build.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'homework-check.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\n\s*/g, '\n');
const href = 'javascript:' + encodeURIComponent(src);
const tpl = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
const version = (src.match(/var VERSION = '([^']+)'/) || [, '?'])[1];
const updated = (src.match(/var UPDATED = '([^']+)'/) || [, ''])[1];
fs.writeFileSync(path.join(__dirname, 'index.html'), tpl.replace('__BOOKMARKLET__', href.replace(/"/g, '&quot;')).split('__VERSION__').join(version).split('__UPDATED__').join(updated.replace(/^(\d+)\.(\d+)\.(\d+)$/, function (_, y, m, d) { return y + '년 ' + (+m) + '월 ' + (+d) + '일'; })));
console.log('index.html 생성 완료 (' + href.length + '자, 버전 v' + version + ' · ' + updated + ')');
