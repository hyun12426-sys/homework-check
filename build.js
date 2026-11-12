// homework-check.js 를 북마크 버튼으로 만들어 index.html 에 넣는다.  실행: node build.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'homework-check.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\n\s*/g, '\n');
const href = 'javascript:' + encodeURIComponent(src);
const tpl = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), tpl.replace('__BOOKMARKLET__', href.replace(/"/g, '&quot;')));
console.log('index.html 생성 완료 (' + href.length + '자)');
