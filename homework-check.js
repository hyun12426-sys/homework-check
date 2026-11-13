/* 삼성영어 숙제 체크 v2 — 원장 어드민 어느 화면에서나 실행
   - 학생 관리(학생 명단 · 학년), 셀레나 관리, LingoFit 관리, VocaFit 관리를 숨은 창으로 읽어서
     숙제 안 한 학생을 한 패널에 모아 보여 줌
   - 원장님이 로그인한 화면 안에서만 동작. 학생 정보를 외부로 보내지 않음. */
(function () {
  var MAIN = function () {
    (async function () {
      var PANEL_ID = 'hwc-panel';
      var VERSION = '11'; // 고칠 때마다 1씩 올리기 (안내 페이지 버튼에도 자동으로 표시됨)
      var UPDATED = '26.11.13'; // 고친 날짜 (연.월.일) — 안내 페이지 버튼에 '26년 11월 13일'로 표시
      var old = document.getElementById(PANEL_ID);
      if (old) { if (old._cleanup) old._cleanup(); old.remove(); }

      var PAGES = {
        members: '/Admin/Member/in_MemberList.asp',
        selena: '/Admin/Member/in_MemberLMS.asp',
        lingo: '/Admin/Member/in_MemberLMS_lingofit.asp',
        voca: '/Admin/Member/in_MemberLMS_vocafit.asp'
      };
      var CATS = [
        { key: 'all', label: '전체' },
        { key: 'selena', label: '셀레나' },
        { key: 'lingo', label: '링고핏' },
        { key: 'voca', label: '보카핏' }
      ];
      var SHORT = { selena: '셀레나', lingo: '링고핏', voca: '보카핏', el: '이러닝' };

      // ---------- 공통 도구 ----------
      var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      function clean(t) { return String(t || '').replace(/[＋+]/g, '').replace(/\s+/g, ' ').trim(); }
      function dateShort(t) { var m = String(t || '').match(/(\d{2})\.(\d{2})\.(\d{2})(?!\d)/); return m ? new Date(2000 + +m[1], +m[2] - 1, +m[3]) : null; }
      function dateLong(t) { var m = String(t || '').match(/(\d{4})\.(\d{2})\.(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
      function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
      function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
      function wd(d) { return d ? '(' + '일월화수목금토'.charAt(d.getDay()) + ')' : ''; }
      function hm(d) { var h = d.getHours(); return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + ('0' + d.getMinutes()).slice(-2); }
      function md(d) { return (d.getMonth() + 1) + '/' + d.getDate() + wd(d); }
      function dot(d) { return String(d.getFullYear()).slice(2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2); }
      function dataRows(doc) {
        return Array.prototype.filter.call(doc.querySelectorAll('#M_Result tr'), function (r) {
          return r.cells.length >= 4 && /^\d+$/.test(r.cells[0].textContent.trim());
        });
      }
      function headerIndex(doc, mustHave) {
        var hr = Array.prototype.find.call(doc.querySelectorAll('tr'), function (r) {
          return r.cells.length >= 4 && r.cells.length < 20 && /회원명/.test(r.textContent) && (!mustHave || mustHave.test(r.textContent));
        });
        var cells = hr ? Array.prototype.map.call(hr.cells, function (c) { return c.textContent.replace(/\s|▽|▼/g, ''); }) : [];
        return function (name, fallback) { var i = cells.findIndex(function (t) { return t.indexOf(name) >= 0; }); return i >= 0 ? i : fallback; };
      }
      function cellText(c) {
        if (!c) return '';
        var s = c.querySelector('select');
        if (s && s.selectedIndex >= 0) return clean(s.options[s.selectedIndex].text);
        return clean(c.textContent);
      }

      // 숨은 창으로 어드민 화면 열기
      var frames = [];
      function openPage(path, fnName) {
        return new Promise(function (resolve, reject) {
          var f = document.createElement('iframe');
          f.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:0;border:0;visibility:hidden';
          f.src = path;
          var timer = setTimeout(function () { reject(new Error(path)); }, 20000);
          f.onload = async function () {
            for (var i = 0; i < 50; i++) {
              if (f.contentWindow && typeof f.contentWindow[fnName] === 'function' && f.contentDocument.getElementById('M_Result')) break;
              await sleep(200);
            }
            clearTimeout(timer);
            if (typeof f.contentWindow[fnName] !== 'function') { reject(new Error(path)); return; }
            await waitStable(f.contentDocument, -1, 800);
            resolve(f);
          };
          document.body.appendChild(f);
          frames.push(f);
        });
      }
      // 표가 다 그려질 때까지 기다리기 (0.3초 간격 세 번 같으면 끝)
      async function waitStable(doc, before, minWait) {
        var stable = 0, last = -2, waited = 0;
        while (waited < 15000) {
          await sleep(300); waited += 300;
          var n = doc.querySelectorAll('#M_Result tr').length;
          if (n === last && waited >= minWait) { if (++stable >= 3) break; } else stable = 0;
          last = n;
        }
      }
      function setRange(doc, from, to) {
        var set = function (id, v) { var e = doc.getElementById(id); if (e) e.value = String(v); };
        set('YY1', from.getFullYear()); set('MM1', from.getMonth() + 1); set('DD1', from.getDate());
        set('YY2', to.getFullYear()); set('MM2', to.getMonth() + 1); set('DD2', to.getDate());
        var ns = doc.getElementById('NS'); if (ns) ns.checked = true;
      }

      // ---------- 패널 ----------
      var css =
        '#hwc-panel{position:fixed;top:12px;right:0;width:380px;max-width:calc(100vw - 48px);z-index:2147483647;color:#2d2640;font:14px/1.5 Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:-0.01em;transition:transform .32s cubic-bezier(.2,.8,.2,1)}' +
        '#hwc-panel.folded{transform:translateX(100%)}' +
        '#hwc-panel .box{background:#fff;border-radius:18px 0 0 18px;box-shadow:0 24px 48px rgba(90,60,160,.22),0 2px 6px rgba(90,60,160,.08);max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden}' +
        '#hwc-panel *{box-sizing:border-box;font-family:inherit}' +
        '#hwc-panel .tab{position:absolute;top:72px;left:-42px;width:42px;padding:14px 0 12px;border:0;border-radius:14px 0 0 14px;background:linear-gradient(160deg,#9a85e0,#7c63c9);color:#fff;cursor:pointer;box-shadow:-6px 8px 20px rgba(90,60,160,.28);display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;font-weight:700;line-height:1.15}' +
        '#hwc-panel .tab .arw{font-size:11px;opacity:.85}' +
        '#hwc-panel .tab .v{writing-mode:vertical-rl;letter-spacing:3px}' +
        '#hwc-panel .tab .cnt{background:#fff;color:#7c63c9;border-radius:999px;min-width:26px;padding:2px 5px;text-align:center;font-weight:800}' +
        '#hwc-panel .hd{background:linear-gradient(135deg,#9a85e0,#7c63c9);color:#fff;padding:16px 18px 14px;display:flex;align-items:center;justify-content:space-between}' +
        '#hwc-panel .hd b{font-size:17px;font-weight:800;letter-spacing:-0.02em}' +
        '#hwc-panel .hd .acts{display:flex;gap:4px}' +
        '#hwc-panel .hd .ver{margin-left:8px;padding:1px 7px;border-radius:999px;background:rgba(255,255,255,.22);font-size:11px;font-weight:700;vertical-align:middle}' +
        '#hwc-panel .x,#hwc-panel .fold{background:rgba(255,255,255,.16);border:0;color:#fff;font-size:16px;cursor:pointer;line-height:1;width:28px;height:28px;border-radius:9px}' +
        '#hwc-panel .x:hover,#hwc-panel .fold:hover{background:rgba(255,255,255,.28)}' +
        '#hwc-panel .ctl{padding:12px 14px 8px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;color:#7d7591;font-size:13px}' +
        '#hwc-panel .chip{padding:5px 9px;border:1px solid #ddd5f2;color:#7d7591;background:#fff;border-radius:999px;cursor:pointer;font-size:12px;font-weight:600}' +
        '#hwc-panel .chip:hover{border-color:#7c63c9;color:#7c63c9}' +
        '#hwc-panel .chip.on{background:#7c63c9;border-color:#7c63c9;color:#fff}' +
        '#hwc-panel .ctl{position:relative}' +
        '#hwc-panel .rf{margin-left:auto;display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border:1px solid #7c63c9;border-radius:999px;background:#fff;color:#5b47a3;font-size:12px;font-weight:700;cursor:pointer}' +
        '#hwc-panel .rf:hover{background:#7c63c9;color:#fff}' +
        '#hwc-panel .rf:disabled{opacity:.5;cursor:wait}' +
        '#hwc-panel .sum .at{display:block;margin-top:2px;font-size:11px;font-weight:500;color:#958ea8}' +
        '#hwc-panel .dpk{position:absolute;right:18px;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none}' +
        '#hwc-panel .dpk.show{position:static;width:auto;height:auto;opacity:1;pointer-events:auto;border:1px solid #ddd5f2;border-radius:8px;padding:3px 6px;font-size:12px}' +
        '#hwc-panel .tabs{display:flex;gap:0;padding:0 10px;border-bottom:1px solid #f0edf7}' +
        '#hwc-panel .tb{flex:1 1 0;min-width:0;white-space:nowrap;border:0;background:none;padding:9px 2px;font-size:13px;font-weight:700;color:#958ea8;cursor:pointer;border-bottom:2px solid transparent}' +
        '#hwc-panel .tb.on{color:#7c63c9;border-bottom-color:#7c63c9}' +
        '#hwc-panel .tb i{font-style:normal;margin-left:3px;font-size:11px;background:#f4f1fb;border-radius:999px;padding:1px 6px;color:#7c63c9}' +
        '#hwc-panel .tb.on i{background:#7c63c9;color:#fff}' +
        '#hwc-panel .sum{margin:10px 18px 6px;padding:9px 14px;background:#f4f1fb;border-radius:12px;font-size:13px;color:#7d7591}' +
        '#hwc-panel .sum strong{color:#7c63c9;font-size:17px;font-weight:800}' +
        '#hwc-panel .sum{border-left:5px solid #7c63c9;color:#4a4060;font-weight:600}' +
        '#hwc-panel .sum strong{font-size:20px;margin-right:2px}' +
        '#hwc-panel .sum.c-selena{background:#fdecf3;border-left-color:#d6457f}#hwc-panel .sum.c-selena strong{color:#c2306b}' +
        '#hwc-panel .sum.c-lingo{background:#e3f5ee;border-left-color:#1f9a72}#hwc-panel .sum.c-lingo strong{color:#16805e}' +
        '#hwc-panel .sum.c-voca{background:#fff1dc;border-left-color:#e08a00}#hwc-panel .sum.c-voca strong{color:#b86e00}' +
        '#hwc-panel .bdg span.b-selena{background:#fdecf3;color:#c2306b}#hwc-panel .bdg span.b-lingo{background:#e3f5ee;color:#16805e}#hwc-panel .bdg span.b-voca{background:#fff1dc;color:#b86e00}' +
        '#hwc-panel .box>*{flex:none}' +
        '#hwc-panel .box>ul{list-style:none;margin:0;padding:0 8px;overflow:auto;flex:1 1 auto;min-height:80px}' +
        '#hwc-panel li{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:9px 10px;border-bottom:1px solid #f0edf7;cursor:pointer;border-radius:10px}' +
        '#hwc-panel li:hover{background:#f7f4fd}' +
        '#hwc-panel li.grp{display:flex;justify-content:space-between;margin-top:6px;padding:7px 10px;border:0;border-radius:10px;background:#efebfa;color:#5b47a3;font-size:13px;font-weight:800;cursor:pointer;user-select:none}' +
        '#hwc-panel li.grp:hover{background:#e4ddf6}' +
        '#hwc-panel li.grp b::before{content:"▾";display:inline-block;width:16px;transition:transform .15s}' +
        '#hwc-panel li.grp.shut b::before{transform:rotate(-90deg)}' +
        '#hwc-panel li.grp.shut{opacity:.75}' +
        '#hwc-panel li.grp span{font-weight:600;color:#7d7591;font-size:12px}' +
        '#hwc-panel .nm{font-weight:700;color:#2d2640}' +
        '#hwc-panel .meta{grid-column:1/2;color:#958ea8;font-size:12px}' +
        '#hwc-panel .dt{grid-row:1/3;grid-column:2;text-align:right;align-self:center;font-size:11px;color:#958ea8}' +
        '#hwc-panel .dt b{display:block;color:#c2477a;font-size:13px;font-weight:700}' +
        '#hwc-panel .bdg{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:170px}' +
        '#hwc-panel .bdg span{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fbe9ef;color:#c2477a;white-space:nowrap}' +
        '#hwc-panel .ft{padding:12px 18px 16px;display:flex;gap:8px;border-top:1px solid #f0edf7}' +
        '#hwc-panel .btn{flex:1;padding:10px;border:0;border-radius:12px;background:#7c63c9;color:#fff;cursor:pointer;font-weight:700;box-shadow:0 6px 14px rgba(124,99,201,.28)}' +
        '#hwc-panel .btn.sub{background:#efebfa;color:#5b47a3;box-shadow:none}' +
        '#hwc-panel .empty,#hwc-panel .loading{padding:26px 18px;text-align:center;color:#7c63c9;font-weight:600}' +
        '#hwc-panel .loading small{display:block;color:#958ea8;font-weight:400;margin-top:6px}' +
        '#hwc-panel .warn{margin:0 18px 6px;font-size:12px;color:#c2477a}' +
        '#hwc-panel .sort{margin:2px 18px 8px;display:flex;align-items:center;gap:8px;font-size:13px;color:#7d7591}' +
        '#hwc-panel .sort .lb{flex:none;font-weight:600}' +
        '#hwc-panel .sort .seg{flex:1;display:flex;gap:2px;padding:3px;background:#f4f1fb;border:1px solid #e4ddf6;border-radius:12px}' +
        '#hwc-panel .sort button{flex:1 1 0;min-width:0;white-space:nowrap;border:0;background:none;padding:6px 2px;border-radius:9px;font-size:12px;font-weight:700;color:#7d7591;cursor:pointer}' +
        '#hwc-panel .sort button:hover{color:#5b47a3;background:#fff}' +
        '#hwc-panel .sort button.on{background:#7c63c9;color:#fff;box-shadow:0 3px 8px rgba(124,99,201,.3)}' +
        '#hwc-panel .low{display:inline-block;margin-top:2px;padding:1px 8px;border-radius:999px;background:#d92d20;color:#fff;font-size:12px;font-weight:800;font-style:normal}' +
        '#hwc-panel .bdg span.lowb{background:#d92d20;color:#fff}' +
        'tr.hwc-miss td{background:#fff3b0 !important}' +
        'tr.hwc-hide{display:none !important}';

      var panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.innerHTML =
        '<style>' + css + '</style>' +
        '<button class="tab" title="접기 / 펼치기"><span class="arw">▶</span><span class="v">숙제체크</span><span class="cnt">…</span></button>' +
        '<div class="box">' +
        '<div class="hd"><b>숙제 안 한 학생<span class="ver">V' + VERSION + '</span></b><span class="acts"><button class="fold" title="오른쪽으로 접기">»</button><button class="x" title="닫기">×</button></span></div>' +
        '<div class="ctl">기준 <button class="chip" data-n="0">오늘</button><button class="chip" data-n="1">어제</button><button class="chip cal" title="달력에서 날짜 고르기">📅 날짜</button><input type="date" class="dpk" tabindex="-1"><button class="rf" title="지금 기록을 다시 읽어 와요">🔄 새로고침</button></div>' +
        '<div class="tabs"></div>' +
        '<div class="sum"></div><div class="warn" hidden></div><div class="sort"></div><ul></ul>' +
        '<div class="ft"><button class="btn copy">명단 복사</button><button class="btn sub only">안 한 학생만 보기</button></div>' +
        '</div>';
      document.body.appendChild(panel);

      var ul = panel.querySelector('ul'), sum = panel.querySelector('.sum'), tabsEl = panel.querySelector('.tabs'), warnEl = panel.querySelector('.warn');
      var onlyBtn = panel.querySelector('.only'), tabArw = panel.querySelector('.tab .arw');
      // 지금 열어 둔 화면에 맞는 탭부터 보여 주기
      var startCat = /lingofit/i.test(location.pathname) ? 'lingo' : /vocafit/i.test(location.pathname) ? 'voca' : /MemberLMS\.asp/i.test(location.pathname) ? 'selena' : 'all';
      var state = { n: 1, cat: startCat, only: false, loading: true, students: [], miss: {}, failed: [], shut: {}, sort: { all: 'many', el: 'old', voca: 'new', selena: 'new', lingo: 'new' } };
      var LOW = 80; // 보카핏 점수가 이보다 낮으면 경고
      var SORTS = {
        all: [['many', '많이 안 한 순'], ['name', '이름순'], ['grade', '학년순']],
        selena: [['name', '이름순'], ['grade', '학년순'], ['new', '최근 순'], ['old', '오래된 순']],
        lingo: [['name', '이름순'], ['grade', '학년순'], ['new', '최근 순'], ['old', '오래된 순']],
        el: [['old', '오래된 순'], ['new', '최근 순'], ['name', '이름순']],
        voca: [['name', '이름순'], ['grade', '학년순'], ['new', '최근 순'], ['old', '오래된 순']]
      };
      var sortEl = panel.querySelector('.sort');
      var today = new Date(); today.setHours(0, 0, 0, 0);

      function setFolded(f) { panel.classList.toggle('folded', f); tabArw.textContent = f ? '◀' : '▶'; }
      panel.querySelector('.tab').onclick = function () { setFolded(!panel.classList.contains('folded')); };
      panel.querySelector('.fold').onclick = function () { setFolded(true); };

      // 지금 보고 있는 화면의 표 (학생 이름으로 줄 칠하기)
      var hereRows = dataRows(document);
      var hereName = headerIndex(document)('회원명', 1);
      function paintHere(names) {
        hereRows.forEach(function (r) {
          var nm = clean(r.cells[hereName] ? r.cells[hereName].textContent : '');
          var m = names.has(nm);
          r.classList.toggle('hwc-miss', m);
          r.classList.toggle('hwc-hide', state.only && !m);
        });
      }
      function cleanup() {
        hereRows.forEach(function (r) { r.classList.remove('hwc-miss', 'hwc-hide'); });
        frames.forEach(function (f) { f.remove(); });
        clearInterval(autoTimer); document.removeEventListener('visibilitychange', onVisible);
      }
      panel._cleanup = cleanup;
      panel.querySelector('.x').onclick = function () { cleanup(); panel.remove(); };

      function loading(msg) {
        ul.innerHTML = '<div class="loading">' + msg + '<small>학생 관리 · 셀레나 · 링고핏 · 보카핏 화면을 읽고 있어요</small></div>';
        sum.textContent = '불러오는 중…';
      }

      // ---------- 데이터 읽기 ----------
      var F = {};
      async function loadMembers() {
        if (F.members) { F.members.remove(); frames.splice(frames.indexOf(F.members), 1); }
        var f = F.members = await openPage(PAGES.members, 'MemberList');
        var w = f.contentWindow, d = f.contentDocument, rowsInput = d.getElementById('ROWS');
        var original = rowsInput ? rowsInput.value : '10';
        if (rowsInput) {
          rowsInput.value = 1000; var before = d.querySelectorAll('#M_Result tr').length;
          w.MemberList(1); await waitStable(d, before, 1500);
          try { if (typeof w.setCookie === 'function') w.setCookie('memRow', parseInt(original, 10) || 10, 600); } catch (e) {}
        }
        var col = headerIndex(d, /이러닝/);
        var cN = col('회원명', 1), cG = col('학년', 2), cB = col('학습교재', 6), cE = col('이러닝', 8);
        // 학생이 한 명도 안 읽히면 로그인이 풀린 것일 수 있어요: "모두 했어요"로 보이지 않게 실패로 처리
        if (!dataRows(d).length) throw new Error('empty');
        return dataRows(d).map(function (r) {
          var c = r.cells, el = clean(c[cE] ? c[cE].textContent : '');
          return { name: clean(c[cN].textContent), grade: clean(c[cG].textContent), book: clean(c[cB] ? c[cB].textContent : ''),
                   elText: (el.match(/\d{2}\.\d{2}\.\d{2}/) || [''])[0], elDate: dateShort(el) };
        });
      }
      async function loadNoStudy(key, path, fn, from) {
        if (!F[key]) F[key] = await openPage(path, fn);
        var w = F[key].contentWindow, d = F[key].contentDocument;
        setRange(d, from, today);
        var before = d.querySelectorAll('#M_Result tr').length;
        w[fn](1); await waitStable(d, before, 1500);
        var hi = headerIndex(d), cN = hi('회원명', 1), cB = hi('학습교재', 3), cT = hi(key === 'lingo' ? '단계' : '티어', 2);
        TIER[key] = {};
        var out = {};
        dataRows(d).forEach(function (r) {
          var nm = clean(r.cells[cN].textContent); if (!nm) return;
          var bk = clean(r.cells[cB] ? r.cells[cB].textContent : '');
          out[nm] = out[nm] ? out[nm] + ', ' + bk : bk;
          if (!TIER[key][nm]) TIER[key][nm] = clean(r.cells[cT] ? r.cells[cT].textContent : '');
        });
        // 최근 순 정렬용: 미학습자 체크를 끄고 최근 한 달 기록을 읽어 학생별 마지막 학습일 찾기
        try {
          var monthAgo = addDays(today, -31), lf = from < monthAgo ? from : monthAgo;
          setRange(d, lf, today); var ns = d.getElementById('NS'); if (ns) ns.checked = false;
          var b2 = d.querySelectorAll('#M_Result tr').length;
          w[fn](1);
          var h2 = headerIndex(d), c2 = h2('회원명', 1), cD = h2('일자', key === 'lingo' ? 5 : 6);
          var dated = function () { return dataRows(d).some(function (r) { return /\d{1,2}\.\d{1,2}/.test(r.cells[cD] ? r.cells[cD].textContent : ''); }); };
          for (var k = 0; k < 60 && !dated(); k++) await sleep(250); // 날짜가 있는 표가 올 때까지 (최대 15초)
          await waitStable(d, -1, 900);
          LAST[key] = {};
          dataRows(d).forEach(function (r) {
            var nm = clean(r.cells[c2] ? r.cells[c2].textContent : ''); if (!nm) return;
            var t = clean(r.cells[cD] ? r.cells[cD].textContent : ''), dt = null, m;
            if ((m = t.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/))) dt = new Date(+m[1], +m[2] - 1, +m[3]);
            else if ((m = t.match(/(\d{1,2})\.(\d{1,2})/))) { var y = today.getFullYear(); if (+m[1] > today.getMonth() + 1) y--; dt = new Date(y, +m[1] - 1, +m[2]); }
            if (dt && (!LAST[key][nm] || dt > LAST[key][nm])) LAST[key][nm] = dt;
          });
        } catch (e) {}
        return out;
      }
      async function loadVoca() {
        if (!F.voca) F.voca = await openPage(PAGES.voca, 'VocafitStudyList');
        else { var bv = F.voca.contentDocument.querySelectorAll('#M_Result tr').length; F.voca.contentWindow.VocafitStudyList(1); await waitStable(F.voca.contentDocument, bv, 1500); }
        var d = F.voca.contentDocument, col = headerIndex(d, /완료일/);
        var cN = col('회원명', 1), cB = col('학습단어장', 2), cD = col('완료일', 4), cS = col('점수', 5);
        if (!dataRows(d).length) throw new Error('empty');
        var out = {};
        dataRows(d).forEach(function (r) {
          var nm = clean(r.cells[cN].textContent); if (!nm) return;
          var dt = cellText(r.cells[cD]);
          out[nm] = { book: cellText(r.cells[cB]), dateText: (dt.match(/\d{4}\.\d{2}\.\d{2}/) || [''])[0], date: dateLong(dt), score: cellText(r.cells[cS]) };
        });
        return out;
      }

      function lastT(s, cat) { return (cat === 'el' ? s.sortEl : cat === 'selena' ? s.sortSel : cat === 'lingo' ? s.sortLin : s.sortVoca) || 0; }
      var members = [], voca = {}, selena = {}, lingo = {}, TIER = { selena: {}, lingo: {} }, LAST = { selena: {}, lingo: {} };
      // 학년 순서: 유치 → 초등 → 중 → 고, 그 안에서 숫자
      function gradeKey(g) {
        g = String(g || ''); var n = parseInt((g.match(/\d+/) || ['0'])[0], 10);
        var lv = /유|7세|6세|5세/.test(g) ? 0 : /초/.test(g) ? 1 : /중/.test(g) ? 2 : /고/.test(g) ? 3 : 4;
        return lv * 100 + n;
      }
      async function fetchAll(first) {
        state.loading = true; state.failed = [];
        loading(first ? '전체 학생을 불러오는 중이에요' : '기준을 바꿔서 다시 확인하는 중이에요');
        var from = addDays(today, -state.n);
        var jobs = [
          first ? loadMembers().then(function (v) { members = v; }) : null,
          first ? loadVoca().then(function (v) { voca = v; }) : null,
          loadNoStudy('selena', PAGES.selena, 'SelenaStudyList', from).then(function (v) { selena = v; }),
          loadNoStudy('lingo', PAGES.lingo, 'LingofitStudyList', from).then(function (v) { lingo = v; })
        ].filter(Boolean);
        var names = { 0: '학생 관리', 1: '보카핏' };
        var results = await Promise.allSettled(jobs);
        results.forEach(function (r, i) {
          if (r.status === 'rejected') state.failed.push(first ? ['학생 관리', '보카핏', '셀레나', '링고핏'][i] : ['셀레나', '링고핏'][i]);
        });
        state.loading = false; state.checkedAt = new Date();
        compute(); render();
      }

      function compute() {
        var base = addDays(today, -state.n);
        var byName = {};
        members.forEach(function (m) { byName[m.name] = { name: m.name, grade: m.grade, book: m.book, miss: {}, info: {} }; });
        function get(nm) { return byName[nm] || (byName[nm] = { name: nm, grade: '', book: '', miss: {}, info: {} }); }
        members.forEach(function (m) {
        });
        Object.keys(selena).forEach(function (nm) { var s = get(nm); s.miss.selena = true; s.info.selena = selena[nm]; s.sortSel = LAST.selena[nm] ? LAST.selena[nm].getTime() : 0; });
        Object.keys(lingo).forEach(function (nm) { var s = get(nm); s.miss.lingo = true; s.info.lingo = lingo[nm]; s.sortLin = LAST.lingo[nm] ? LAST.lingo[nm].getTime() : 0; });
        Object.keys(voca).forEach(function (nm) {
          var v = voca[nm];
          if (!v.date || v.date < base) { var s = get(nm); s.miss.voca = true; s.info.voca = (v.dateText ? '마지막 ' + v.dateText.slice(2) + wd(v.date) : '기록 없음') + (v.score ? ' · ' + v.score + '점' : ''); s.sortVoca = v.date ? v.date.getTime() : 0;
            var sc = parseInt(v.score, 10); s.score = isNaN(sc) ? null : sc; }
        });
        state.students = Object.keys(byName).map(function (k) { return byName[k]; });
      }

      function listFor(cat) {
        return state.students.filter(function (s) {
          if (cat === 'all') return s.miss.selena || s.miss.lingo || s.miss.voca || s.miss.el;
          return s.miss[cat];
        });
      }

      function render() {
        panel.querySelectorAll('.chip[data-n]').forEach(function (b) { b.classList.toggle('on', !state.custom && +b.dataset.n === state.n); });
        var calBtn = panel.querySelector('.chip.cal');
        calBtn.classList.toggle('on', !!state.custom);
        calBtn.textContent = state.custom ? '📅 ' + md(addDays(today, -state.n)) : '📅 날짜';
        if (state.loading) return;
        var base = addDays(today, -state.n);
        tabsEl.innerHTML = CATS.map(function (c) {
          return '<button class="tb' + (c.key === state.cat ? ' on' : '') + '" data-c="' + c.key + '">' + c.label + '<i>' + listFor(c.key).length + '</i></button>';
        }).join('');
        tabsEl.querySelectorAll('.tb').forEach(function (b) { b.onclick = function () { state.cat = b.dataset.c; render(); }; });

        var list = listFor(state.cat);
        var cat = state.cat;
        var how = state.sort[cat];
        var byName = function (a, b) { return a.name.localeCompare(b.name, 'ko'); };
        list.sort(function (a, b) {
          if (how === 'name') return byName(a, b);
          if (how === 'grade') return gradeKey(a.grade) - gradeKey(b.grade) || byName(a, b);
          if (how === 'book') return String(a.info[cat] || a.book || '').localeCompare(String(b.info[cat] || b.book || ''), 'ko', { numeric: true }) || byName(a, b);
          if (how === 'tier') return String((TIER[cat] || {})[a.name] || '').localeCompare(String((TIER[cat] || {})[b.name] || ''), 'ko', { numeric: true }) || byName(a, b);
          if (how === 'many') return Object.keys(b.miss).length - Object.keys(a.miss).length || byName(a, b);
          if (how === 'score') { var sa = a.score == null ? 999 : a.score, sb = b.score == null ? 999 : b.score; return sa - sb || byName(a, b); }
          var ta = lastT(a, cat), tb = lastT(b, cat);
          return (how === 'new' ? tb - ta : ta - tb) || byName(a, b);
        });
        var opts = SORTS[cat];
        sortEl.hidden = opts.length < 2;
        sortEl.innerHTML = '<span class="lb">정렬</span><span class="seg">' + opts.map(function (o) { return '<button data-s="' + o[0] + '" class="' + (o[0] === how ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</span>';
        sortEl.querySelectorAll('button').forEach(function (b) { b.onclick = function () { state.sort[cat] = b.dataset.s; render(); }; });
        panel.querySelector('.tab .cnt').textContent = listFor('all').length;
        var label = { all: '숙제를 하나라도 안 한 학생', selena: '셀레나 미학습', lingo: '링고핏 미학습', voca: '보카핏 미완료', el: '이러닝(셀레나·헤이즐·단어장) 학습 기록 없음' }[cat];
        sum.className = 'sum c-' + cat;
        sum.innerHTML = '<strong>' + list.length + '명</strong> · ' + md(base) + ' 이후 ' + label + (state.checkedAt ? '<span class="at">' + hm(state.checkedAt) + '에 확인한 결과예요 · 5분마다 자동으로 다시 확인해요</span>' : '');
        warnEl.hidden = !state.failed.length;
        warnEl.textContent = state.failed.length ? state.failed.join(', ') + ' 화면을 읽지 못했어요. 어드민 로그인이 풀렸을 수 있어요. 새로 고침(F5)이나 다시 로그인한 뒤 눌러 주세요.' : '';
        if (state.failed.indexOf('학생 관리') >= 0) {
          ul.innerHTML = '<div class="empty">학생 명단을 읽지 못했어요<small style="display:block;color:#958ea8;font-weight:400;margin-top:6px">어드민 로그인이 풀렸을 수 있어요.<br>새로 고침(F5)하거나 다시 로그인한 뒤 눌러 주세요.</small></div>';
          sum.textContent = '확인하지 못했어요';
          tabsEl.querySelectorAll('.tb i').forEach(function (i) { i.textContent = '-'; });
          panel.querySelector('.tab .cnt').textContent = '!';
          return;
        }

        paintHere(new Set(list.map(function (s) { return s.name; })));
        if (!list.length) { ul.innerHTML = '<div class="empty">모두 숙제를 했어요 🎉</div>'; return; }
        ul.innerHTML = '';
        // 오래된 순 · 최근 순일 때는 날짜마다 묶어서 보여 주기
        var byGrade = how === 'grade';
        var grouped = byGrade || (cat !== 'all' && (how === 'old' || how === 'new'));
        var dayOf = function (s) { if (byGrade) return s.grade || '학년 정보 없음'; var t = lastT(s, cat); if (!t) return (cat === 'selena' || cat === 'lingo') ? '한 달 넘게 기록 없음' : '기록 없음'; var d = new Date(t); return (d.getFullYear() !== today.getFullYear() ? (d.getFullYear() % 100) + '년 ' : '') + md(d); };
        var counts = {}; if (grouped) list.forEach(function (s) { var k = dayOf(s); counts[k] = (counts[k] || 0) + 1; });
        var lastDay = null, shutNow = false;
        list.forEach(function (s) {
          if (grouped && dayOf(s) !== lastDay) {
            lastDay = dayOf(s);
            var gk = cat + '|' + how + '|' + lastDay;
            shutNow = !!state.shut[gk];
            var g = document.createElement('li'); g.className = 'grp' + (shutNow ? ' shut' : '');
            g.title = shutNow ? '눌러서 펼치기' : '눌러서 접기';
            g.onclick = (function (k) { return function () {
              var shut = state.shut[k] = !state.shut[k];
              this.classList.toggle('shut', shut); this.title = shut ? '눌러서 펼치기' : '눌러서 접기';
              for (var n = this.nextElementSibling; n && !n.classList.contains('grp'); n = n.nextElementSibling) n.style.display = shut ? 'none' : '';
            }; })(gk);
            var gb = document.createElement('b'); gb.textContent = (byGrade || /없음$/.test(lastDay)) ? lastDay : '마지막 ' + lastDay;
            var gs = document.createElement('span'); gs.textContent = counts[lastDay] + '명';
            g.appendChild(gb); g.appendChild(gs); ul.appendChild(g);
          }
          var li = document.createElement('li');
          if (grouped && shutNow) li.style.display = 'none';
          li.innerHTML = '<span class="nm"></span><span class="dt"></span><span class="meta"></span>';
          li.querySelector('.nm').textContent = s.name;
          var dt = li.querySelector('.dt');
          if (cat === 'all') {
            var b = document.createElement('div'); b.className = 'bdg';
            ['selena', 'lingo', 'voca', 'el'].forEach(function (k) {
              if (!s.miss[k]) return;
              var sp = document.createElement('span'); sp.textContent = SHORT[k]; sp.className = 'b-' + k;
              b.appendChild(sp);
            });
            dt.appendChild(b);
            li.querySelector('.meta').textContent = [s.grade, s.book].filter(Boolean).join(' · ');
          } else {
            var bb = document.createElement('b');
            bb.textContent = cat === 'selena' || cat === 'lingo' ? (lastT(s, cat) ? '마지막 ' + md(new Date(lastT(s, cat))) : '한 달 넘게 없음') : s.info[cat].split(' · ')[0];
            dt.appendChild(bb);
            if (cat === 'voca' && s.score != null) {
              if (s.score < LOW) { var em = document.createElement('em'); em.className = 'low'; em.textContent = '⚠ ' + s.score + '점'; dt.appendChild(em); }
              else dt.appendChild(document.createTextNode(s.score + '점'));
            }
            li.querySelector('.meta').textContent = [s.grade, (cat === 'selena' || cat === 'lingo') ? (TIER[cat][s.name] || '') : '', (cat === 'selena' || cat === 'lingo') ? s.info[cat] : (cat === 'voca' ? (voca[s.name] || {}).book : s.book)].filter(Boolean).join(' · ');
          }
          li.onclick = function () {
            var r = hereRows.find(function (x) { return clean(x.cells[hereName] ? x.cells[hereName].textContent : '') === s.name; });
            if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' });
          };
          ul.appendChild(li);
        });
      }

      panel.querySelectorAll('.chip[data-n]').forEach(function (b) {
        b.onclick = function () { if (state.loading) return; state.custom = false; state.n = +b.dataset.n; compute(); render(); fetchAll(false); };
      });
      // 달력: 고른 날짜 이후로 숙제 안 한 학생
      var dpk = panel.querySelector('.dpk');
      dpk.max = ymd(today);
      // 새로고침: 지금 시각 기준으로 네 화면을 다시 읽기 (패널을 켜 둔 채 시간이 지났을 때)
      var rfBtn = panel.querySelector('.rf');
      rfBtn.onclick = async function () {
        if (state.loading) return;
        rfBtn.disabled = true;
        var now = new Date(); now.setHours(0, 0, 0, 0);
        if (now.getTime() !== today.getTime()) { today = now; dpk.max = ymd(today); }
        try { await fetchAll(true); } finally { rfBtn.disabled = false; }
      };
      // 실시간: 패널이 열려 있는 동안 5분마다 자동으로 다시 확인, 다른 창에 있다 돌아왔을 때도 5분 지났으면 다시 확인
      var AUTO_MS = 5 * 60 * 1000;
      function stale() { return !state.loading && state.checkedAt && (new Date() - state.checkedAt) >= AUTO_MS - 1000; }
      var autoTimer = setInterval(function () { if (!document.hidden && stale()) rfBtn.onclick(); }, 30000);
      function onVisible() { if (!document.hidden && stale()) rfBtn.onclick(); }
      document.addEventListener('visibilitychange', onVisible);
      panel.querySelector('.chip.cal').onclick = function () {
        if (state.loading) return;
        dpk.value = ymd(addDays(today, -state.n));
        try { dpk.showPicker(); } catch (e) { dpk.classList.add('show'); dpk.focus(); }
      };
      dpk.onchange = function () {
        var m = dpk.value.match(/(\d{4})-(\d{2})-(\d{2})/); if (!m || state.loading) return;
        var picked = new Date(+m[1], +m[2] - 1, +m[3]);
        var n = Math.round((today - picked) / 864e5); if (n < 0) n = 0;
        dpk.classList.remove('show');
        state.custom = [0, 1].indexOf(n) < 0; state.n = n;
        compute(); render(); fetchAll(false);
      };
      onlyBtn.onclick = function () {
        state.only = !state.only;
        onlyBtn.textContent = state.only ? '전체 학생 보기' : '안 한 학생만 보기';
        render();
      };
      panel.querySelector('.copy').onclick = function () {
        var list = listFor(state.cat);
        var text = list.map(function (s) {
          var what = ['selena', 'lingo', 'voca', 'el'].filter(function (k) { return s.miss[k] && (state.cat === 'all' || state.cat === k); })
            .map(function (k) { return SHORT[k] + (s.info[k] && (k === 'voca' || k === 'el') ? '(' + s.info[k] + ')' : ''); });
          return s.name + (s.grade ? ' (' + s.grade + ')' : '') + ' - ' + what.join(', ') + ' 안 함';
        }).join('\n');
        var btn = panel.querySelector('.copy');
        var done = function () { btn.textContent = '복사됨 ✓'; setTimeout(function () { btn.textContent = '명단 복사'; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt('복사하세요', text); });
        else window.prompt('복사하세요', text);
      };

      render();
      fetchAll(true);
    })();
  };

  // 어드민은 메뉴로 들어가면 내용이 안쪽 창(sel_contents)에 열려요. 그 창에서 실행.
  if (!/samsungenglish\.com$/.test(location.hostname) || !/^\/Admin/i.test(location.pathname)) {
    alert('삼성영어 원장 어드민에 로그인한 화면에서 눌러 주세요.');
    return;
  }
  var target = window;
  if (!document.body || document.body.tagName === 'FRAMESET') {
    try { target = window.frames['sel_contents'] || window; } catch (e) { target = window; }
  }
  if (target === window) { MAIN(); return; }
  var s = target.document.createElement('script');
  s.textContent = '(' + MAIN.toString() + ')();';
  target.document.body.appendChild(s);
})();
