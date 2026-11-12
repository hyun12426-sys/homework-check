/* 삼성영어 숙제 체크 — 원장 어드민 [학생 관리] 화면에서 실행
   - 원장님이 로그인한 화면 안에서만 동작. 아무 데이터도 외부로 보내지 않음.
   - 이러닝 최근학습일이 기준일보다 이전(또는 기록 없음)이면 "숙제 안 함" */
(async function () {
  var PANEL_ID = 'hwc-panel';
  var old = document.getElementById(PANEL_ID);
  if (old) old.remove();

  if (!document.getElementById('M_Result') || typeof window.MemberList !== 'function') {
    alert('삼성영어 원장 어드민의 [학원관리 > 학생 관리] 화면에서 눌러 주세요.');
    return;
  }

  function dataRows() {
    return Array.prototype.filter.call(
      document.querySelectorAll('#M_Result tr'),
      function (r) { return r.cells.length >= 8 && /^\d+$/.test(r.cells[0].textContent.trim()); }
    );
  }

  // 1) 모든 학생이 한 화면에 나오도록 잠깐 늘려서 불러오기
  var rowsInput = document.getElementById('ROWS');
  var originalRows = rowsInput ? rowsInput.value : '10';
  if (rowsInput && parseInt(originalRows, 10) < 1000) {
    rowsInput.value = 1000;
    var before = dataRows().length;
    window.MemberList(1);
    // 표가 다시 그려질 때까지 기다림 (최대 15초)
    var stable = 0, last = -1, waited = 0;
    while (waited < 15000) {
      await new Promise(function (r) { setTimeout(r, 300); });
      waited += 300;
      var n = dataRows().length;
      if (n === last && n > 0 && (n !== before || waited > 2000)) { if (++stable >= 3) break; }
      else stable = 0;
      last = n;
    }
    // 다음 접속 때 한 페이지 보기 개수는 원래대로
    rowsInput.value = originalRows;
    try { if (typeof window.setCookie === 'function') window.setCookie('memRow', parseInt(originalRows, 10) || 10, 365); } catch (e) {}
  }

  // 2) 열 위치 찾기 (헤더 글자로)
  var table = document.getElementById('M_Result');
  var headerCells = [];
  var hr = Array.prototype.find.call(document.querySelectorAll('tr'), function (r) {
    return r.cells.length >= 8 && r.cells.length < 20 && /이러닝/.test(r.textContent) && /회원명/.test(r.textContent);
  });
  if (hr) headerCells = Array.prototype.map.call(hr.cells, function (c) { return c.textContent.replace(/\s|▽|▼/g, ''); });
  function col(name, fallback) {
    var i = headerCells.findIndex(function (t) { return t.indexOf(name) >= 0; });
    return i >= 0 ? i : fallback;
  }
  var C_NO = 0, C_NAME = col('회원명', 1), C_GRADE = col('학년', 2), C_BOOK = col('학습교재', 6), C_EL = col('이러닝', 8);

  function clean(t) { return t.replace(/[＋+]/g, '').replace(/\s+/g, ' ').trim(); }
  function parseDate(t) {
    var m = t.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    return m ? new Date(2000 + +m[1], +m[2] - 1, +m[3]) : null;
  }

  var students = dataRows().map(function (r) {
    var c = r.cells;
    var elText = clean(c[C_EL] ? c[C_EL].textContent : '');
    return {
      row: r,
      no: clean(c[C_NO].textContent),
      name: clean(c[C_NAME].textContent),
      grade: clean(c[C_GRADE].textContent),
      book: clean(c[C_BOOK] ? c[C_BOOK].textContent : ''),
      dateText: (elText.match(/\d{2}\.\d{2}\.\d{2}/) || [''])[0],
      date: parseDate(elText)
    };
  });

  // 3) 패널 그리기
  var today = new Date(); today.setHours(0, 0, 0, 0);
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }

  var css =
    '#hwc-panel{position:fixed;top:12px;right:12px;width:360px;max-height:calc(100vh - 24px);z-index:2147483647;background:#fff;color:#222;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.25);font:14px/1.45 "Malgun Gothic",sans-serif;display:flex;flex-direction:column;overflow:hidden}' +
    '#hwc-panel *{box-sizing:border-box;font-family:inherit}' +
    '#hwc-panel .hd{background:#d63384;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between}' +
    '#hwc-panel .hd b{font-size:16px}' +
    '#hwc-panel .x{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}' +
    '#hwc-panel .ctl{padding:10px 14px;border-bottom:1px solid #eee;display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '#hwc-panel .ctl input[type=date]{padding:4px 6px;border:1px solid #ccc;border-radius:6px}' +
    '#hwc-panel .chip{padding:4px 9px;border:1px solid #d63384;color:#d63384;background:#fff;border-radius:999px;cursor:pointer;font-size:12px}' +
    '#hwc-panel .chip.on{background:#d63384;color:#fff}' +
    '#hwc-panel .sum{padding:8px 14px;background:#fff5f9;font-size:13px}' +
    '#hwc-panel .sum strong{color:#d63384;font-size:16px}' +
    '#hwc-panel ul{list-style:none;margin:0;padding:0;overflow:auto;flex:1}' +
    '#hwc-panel li{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:8px 14px;border-bottom:1px solid #f1f1f1;cursor:pointer}' +
    '#hwc-panel li:hover{background:#fafafa}' +
    '#hwc-panel .nm{font-weight:bold}' +
    '#hwc-panel .meta{grid-column:1/2;color:#777;font-size:12px}' +
    '#hwc-panel .dt{grid-row:1/3;grid-column:2;text-align:right;align-self:center;font-size:12px;color:#777}' +
    '#hwc-panel .dt b{display:block;color:#c0392b;font-size:13px}' +
    '#hwc-panel .ft{padding:10px 14px;display:flex;gap:6px;border-top:1px solid #eee}' +
    '#hwc-panel .btn{flex:1;padding:8px;border:0;border-radius:8px;background:#333;color:#fff;cursor:pointer}' +
    '#hwc-panel .btn.sub{background:#eee;color:#333}' +
    '#hwc-panel .empty{padding:24px 14px;text-align:center;color:#2e7d32}' +
    'tr.hwc-miss td{background:#fff3b0 !important}' +
    'tr.hwc-hide{display:none !important}';

  var panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML =
    '<style>' + css + '</style>' +
    '<div class="hd"><b>숙제 안 한 학생</b><button class="x" title="닫기">×</button></div>' +
    '<div class="ctl">기준일 <input type="date" class="d"> 이후 학습 <span style="flex-basis:100%;height:0"></span>' +
    '<button class="chip" data-n="1">어제</button><button class="chip" data-n="2">2일</button><button class="chip" data-n="3">3일</button><button class="chip" data-n="7">7일</button></div>' +
    '<div class="sum"></div><ul></ul>' +
    '<div class="ft"><button class="btn copy">명단 복사</button><button class="btn sub only">표에서 안 한 학생만 보기</button></div>';
  document.body.appendChild(panel);

  var dIn = panel.querySelector('.d'), ul = panel.querySelector('ul'), sum = panel.querySelector('.sum');
  var onlyBtn = panel.querySelector('.only');
  var onlyMode = false, missing = [];

  function render() {
    var base = dIn.value ? new Date(dIn.value + 'T00:00:00') : addDays(today, -1);
    panel.querySelectorAll('.chip').forEach(function (b) {
      b.classList.toggle('on', ymd(addDays(today, -b.dataset.n)) === dIn.value);
    });
    missing = students.filter(function (s) { return !s.date || s.date < base; });
    missing.sort(function (a, b) { return (a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0); });
    students.forEach(function (s) {
      var miss = missing.indexOf(s) >= 0;
      s.row.classList.toggle('hwc-miss', miss);
      s.row.classList.toggle('hwc-hide', onlyMode && !miss);
    });
    sum.innerHTML = '전체 ' + students.length + '명 중 <strong>' + missing.length + '명</strong> · ' + md(base) + ' 이후 학습 기록 없음';
    if (!missing.length) { ul.innerHTML = '<div class="empty">모두 숙제를 했어요 🎉</div>'; return; }
    ul.innerHTML = '';
    missing.forEach(function (s) {
      var li = document.createElement('li');
      var days = s.date ? Math.round((today - s.date) / 86400000) : null;
      li.innerHTML = '<span class="nm"></span><span class="dt"><b></b></span><span class="meta"></span>';
      li.querySelector('.nm').textContent = s.name;
      li.querySelector('.meta').textContent = s.grade + (s.book ? ' · ' + s.book : '');
      li.querySelector('.dt b').textContent = days === null ? '기록 없음' : days + '일 전';
      if (s.dateText) li.querySelector('.dt').appendChild(document.createTextNode(s.dateText));
      li.onclick = function () { s.row.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
      ul.appendChild(li);
    });
  }

  dIn.value = ymd(addDays(today, -1));
  dIn.onchange = render;
  panel.querySelectorAll('.chip').forEach(function (b) {
    b.onclick = function () { dIn.value = ymd(addDays(today, -b.dataset.n)); render(); };
  });
  panel.querySelector('.x').onclick = function () {
    students.forEach(function (s) { s.row.classList.remove('hwc-miss', 'hwc-hide'); });
    panel.remove();
  };
  onlyBtn.onclick = function () {
    onlyMode = !onlyMode;
    onlyBtn.textContent = onlyMode ? '전체 학생 다시 보기' : '표에서 안 한 학생만 보기';
    render();
  };
  panel.querySelector('.copy').onclick = function () {
    var text = missing.map(function (s) {
      return s.name + ' (' + s.grade + ') - ' + (s.dateText ? '마지막 학습 ' + s.dateText : '학습 기록 없음');
    }).join('\n');
    var done = function () { var b = panel.querySelector('.copy'); b.textContent = '복사됨 ✓'; setTimeout(function () { b.textContent = '명단 복사'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('복사하세요', text); });
    else prompt('복사하세요', text);
  };
  render();
})();
