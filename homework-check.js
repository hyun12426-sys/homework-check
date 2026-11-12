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
    /* 라벤더 소프트 테마 */
    '#hwc-panel{position:fixed;top:12px;right:0;width:360px;max-width:calc(100vw - 48px);z-index:2147483647;color:#2d2640;font:14px/1.5 Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:-0.01em;transition:transform .32s cubic-bezier(.2,.8,.2,1)}' +
    '#hwc-panel.folded{transform:translateX(100%)}' +
    '#hwc-panel .box{background:#fff;border-radius:18px 0 0 18px;box-shadow:0 24px 48px rgba(90,60,160,.22),0 2px 6px rgba(90,60,160,.08);max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden}' +
    '#hwc-panel *{box-sizing:border-box;font-family:inherit}' +
    '#hwc-panel button{font-family:inherit}' +
    '#hwc-panel .tab{position:absolute;top:72px;left:-42px;width:42px;padding:14px 0 12px;border:0;border-radius:14px 0 0 14px;background:linear-gradient(160deg,#9a85e0,#7c63c9);color:#fff;cursor:pointer;box-shadow:-6px 8px 20px rgba(90,60,160,.28);display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;font-weight:700;line-height:1.15}' +
    '#hwc-panel .tab:hover{filter:brightness(1.06)}' +
    '#hwc-panel .tab .arw{font-size:11px;opacity:.85}' +
    '#hwc-panel .tab .v{writing-mode:vertical-rl;letter-spacing:3px}' +
    '#hwc-panel .tab .cnt{background:#fff;color:#7c63c9;border-radius:999px;min-width:26px;padding:2px 5px;text-align:center;font-weight:800}' +
    '#hwc-panel .hd{background:linear-gradient(135deg,#9a85e0,#7c63c9);color:#fff;padding:16px 18px 14px;display:flex;align-items:center;justify-content:space-between}' +
    '#hwc-panel .hd b{font-size:17px;font-weight:800;letter-spacing:-0.02em}' +
    '#hwc-panel .hd .acts{display:flex;gap:2px}' +
    '#hwc-panel .x,#hwc-panel .fold{background:rgba(255,255,255,.16);border:0;color:#fff;font-size:16px;cursor:pointer;line-height:1;width:28px;height:28px;border-radius:9px}' +
    '#hwc-panel .x:hover,#hwc-panel .fold:hover{background:rgba(255,255,255,.28)}' +
    '#hwc-panel .ctl{padding:14px 18px 12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:#7d7591;font-size:13px}' +
    '#hwc-panel .ctl input[type=date]{padding:5px 8px;border:1px solid #ddd5f2;border-radius:10px;color:#2d2640;background:#fbfaff;font-family:inherit}' +
    '#hwc-panel .chip{padding:5px 12px;border:1px solid #ddd5f2;color:#7d7591;background:#fff;border-radius:999px;cursor:pointer;font-size:12px;font-weight:600}' +
    '#hwc-panel .chip:hover{border-color:#7c63c9;color:#7c63c9}' +
    '#hwc-panel .chip.on{background:#7c63c9;border-color:#7c63c9;color:#fff}' +
    '#hwc-panel .sum{margin:0 18px 8px;padding:10px 14px;background:#f4f1fb;border-radius:12px;font-size:13px;color:#7d7591}' +
    '#hwc-panel .sum strong{color:#7c63c9;font-size:18px;font-weight:800}' +
    '#hwc-panel ul{list-style:none;margin:0;padding:0 8px;overflow:auto;flex:1}' +
    '#hwc-panel li{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:10px 10px;border-bottom:1px solid #f0edf7;cursor:pointer;border-radius:10px}' +
    '#hwc-panel li:hover{background:#f7f4fd}' +
    '#hwc-panel .nm{font-weight:700;color:#2d2640}' +
    '#hwc-panel .meta{grid-column:1/2;color:#958ea8;font-size:12px}' +
    '#hwc-panel .dt{grid-row:1/3;grid-column:2;text-align:right;align-self:center;font-size:11px;color:#958ea8}' +
    '#hwc-panel .dt b{display:block;color:#c2477a;font-size:13px;font-weight:700}' +
    '#hwc-panel .ft{padding:12px 18px 16px;display:flex;gap:8px;border-top:1px solid #f0edf7}' +
    '#hwc-panel .btn{flex:1;padding:10px;border:0;border-radius:12px;background:#7c63c9;color:#fff;cursor:pointer;font-weight:700;box-shadow:0 6px 14px rgba(124,99,201,.28)}' +
    '#hwc-panel .btn:hover{filter:brightness(1.06)}' +
    '#hwc-panel .btn.sub{background:#efebfa;color:#5b47a3;box-shadow:none}' +
    '#hwc-panel .empty{padding:28px 18px;text-align:center;color:#7c63c9;font-weight:600}' +
    'tr.hwc-miss td{background:#efe9fc !important}' +
    'tr.hwc-hide{display:none !important}';

  var panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML =
    '<style>' + css + '</style>' +
    '<button class="tab" title="접기 / 펼치기"><span class="arw">▶</span><span class="v">숙제체크</span><span class="cnt">0</span></button>' +
    '<div class="box">' +
    '<div class="hd"><b>숙제 안 한 학생</b><span class="acts"><button class="fold" title="오른쪽으로 접기">»</button><button class="x" title="닫기">×</button></span></div>' +
    '<div class="ctl">기준일 <input type="date" class="d"> 이후 학습 <span style="flex-basis:100%;height:0"></span>' +
    '<button class="chip" data-n="1">어제</button><button class="chip" data-n="2">2일</button><button class="chip" data-n="3">3일</button><button class="chip" data-n="7">7일</button></div>' +
    '<div class="sum"></div><ul></ul>' +
    '<div class="ft"><button class="btn copy">명단 복사</button><button class="btn sub only">안 한 학생만 보기</button></div>' +
    '</div>';
  document.body.appendChild(panel);

  // 사이드 도어: 오른쪽으로 접었다 펼치기
  var tabArw = panel.querySelector('.tab .arw');
  function setFolded(f) {
    panel.classList.toggle('folded', f);
    tabArw.textContent = f ? '◀' : '▶';
  }
  panel.querySelector('.tab').onclick = function () { setFolded(!panel.classList.contains('folded')); };
  panel.querySelector('.fold').onclick = function () { setFolded(true); };

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
    panel.querySelector('.tab .cnt').textContent = missing.length;
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
    onlyBtn.textContent = onlyMode ? '전체 학생 보기' : '안 한 학생만 보기';
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
