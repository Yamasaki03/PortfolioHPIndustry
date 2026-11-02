/* 生駒精密工業(制作サンプル) 全ページ共通の動き
   - JSが動かなくても内容はすべて表示される(html.js のときだけ隠して出す)
   - 「視差効果を減らす」設定では、動きを止めて最初から表示する */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pageName = document.body.getAttribute('data-page') || 'unknown';

  /* ---------- 計測(GTMの dataLayer に送る。個人情報は送らない) ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var data = { event: event, page: pageName };
    for (var k in params) data[k] = params[k];
    window.dataLayer.push(data);
  }
  window.ikTrack = track;

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.hasAttribute('data-cta')) track('cta_click', { button: a.getAttribute('data-cta') });
    if (a.href && a.href.indexOf('tel:') === 0) track('tel_click', { position: a.getAttribute('data-tel') || 'body' });
  });

  /* ---------- ヘッダー:スクロールすると白地に紺文字 ---------- */
  var header = document.querySelector('.site-header');
  function onHeaderScroll() {
    if (!header) return;
    header.classList.toggle('is-solid', window.scrollY > 40);
  }

  /* ---------- スマホのメニュー ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var gnav = document.getElementById('gnav');
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    if (open) {
      var first = gnav.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 300);
    }
  }
  if (menuBtn && gnav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    gnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- 画面に入ったら出す ---------- */
  var revealEls = document.querySelectorAll('[data-reveal], .timeline__item, .growth-bar');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    /* clip-pathで隠した要素は交差判定に使えないため、親要素を見張る */
    var watchMap = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          (watchMap.get(entry.target) || []).forEach(function (el) { el.classList.add('is-in'); });
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    revealEls.forEach(function (el) {
      var type = el.getAttribute('data-reveal');
      var watch = (type === 'cut' || type === 'photo') ? el.parentElement : el;
      if (!watchMap.has(watch)) {
        watchMap.set(watch, []);
        io.observe(watch);
      }
      watchMap.get(watch).push(el);
    });
  }

  /* カードを順番に:data-stagger の子要素に遅れをつける */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var step = parseInt(group.getAttribute('data-stagger'), 10) || 100;
    Array.prototype.forEach.call(group.querySelectorAll('[data-reveal]'), function (el, i) {
      el.style.setProperty('--d', (i * step) + 'ms');
    });
  });

  /* ---------- 数字が0から増えて止まる ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var from = parseFloat(el.getAttribute('data-from') || '0');
    var duration = 1600;
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (from + (target - from) * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      el.textContent = parseFloat(el.getAttribute('data-from') || '0').toFixed((el.getAttribute('data-count').split('.')[1] || '').length);
      cio.observe(el);
    });
  }

  /* ---------- ファーストビューの火花(一度だけ、小さな範囲で) ---------- */
  var sparks = document.querySelector('[data-sparks]');
  if (sparks && !reduceMotion) {
    var isSp = window.innerWidth < 768;
    var count = isSp ? 12 : 18;
    var reach = isSp ? 110 : 180;
    var baseDelay = isSp ? 1.0 : 1.08;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var angle = (-150 + Math.random() * 170) * Math.PI / 180;
      var dist = reach * (0.3 + Math.random() * 0.7);
      s.style.setProperty('--dx', Math.round(Math.cos(angle) * dist) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(angle) * dist) + 'px');
      s.style.animationDelay = (baseDelay + Math.random() * 0.14).toFixed(2) + 's';
      sparks.appendChild(s);
    }
  }

  /* ---------- スクロールに合わせた動き ---------- */
  var driftEls = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));
  var plxEls = Array.prototype.slice.call(document.querySelectorAll('.plx > img'));
  var timelines = Array.prototype.slice.call(document.querySelectorAll('.timeline'));
  var pin = document.querySelector('[data-pin]');
  var pinTrack = pin ? pin.querySelector('.works-track') : null;
  var pinProgress = pin ? pin.querySelector('.works-progress') : null;
  var pinCount = pin ? pin.querySelector('[data-pin-count]') : null;
  var pinMq = window.matchMedia('(min-width: 1024px) and (hover: hover)');
  var pinDistance = 0;
  var PIN_SLOW = 1.6; // 縦に1.6px進むと横に1px動く
  var vh = window.innerHeight;

  /* 加工事例:PCでは画面を固定して、縦のスクロールで横に動かす */
  function setupPin() {
    if (!pin || !pinTrack) return;
    var use = pinMq.matches && !reduceMotion;
    pin.classList.toggle('is-pinned', use);
    if (!use) {
      pin.style.height = '';
      pinTrack.style.removeProperty('--x');
      return;
    }
    pinTrack.style.setProperty('--x', '0px');
    var trackWidth = pinTrack.scrollWidth;
    pinDistance = Math.max(0, trackWidth - window.innerWidth);
    var stickyH = pin.querySelector('.works-pin__sticky').offsetHeight;
    pin.style.height = (stickyH + pinDistance * PIN_SLOW) + 'px';
  }

  function updatePin() {
    if (!pin || !pin.classList.contains('is-pinned')) return;
    var rect = pin.getBoundingClientRect();
    var p = pinDistance ? Math.min(Math.max(-rect.top / (pinDistance * PIN_SLOW), 0), 1) : 0;
    pinTrack.style.setProperty('--x', (-p * pinDistance).toFixed(1) + 'px');
    if (pinProgress) pinProgress.style.setProperty('--p', p.toFixed(3));
    if (pinCount) {
      var total = pinTrack.children.length;
      var idx = Math.min(total, Math.floor(p * (total - 1) + 1.5));
      pinCount.textContent = String(idx).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
  }

  function updateScrollEffects() {
    onHeaderScroll();
    if (reduceMotion) return;

    driftEls.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh; // -1〜1
      el.style.transform = 'translate3d(' + (p * 60).toFixed(1) + 'px,0,0)';
    });

    plxEls.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1〜1
      img.style.setProperty('--plx', (p * -r.height * 0.05).toFixed(1) + 'px');
    });

    timelines.forEach(function (tl) {
      var r = tl.getBoundingClientRect();
      var p = (vh * 0.65 - r.top) / r.height;
      tl.style.setProperty('--tl', Math.min(Math.max(p, 0), 1).toFixed(3));
    });

    updatePin();
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateScrollEffects();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      vh = window.innerHeight;
      setupPin();
      updateScrollEffects();
    }, 150);
  });
  pinMq.addEventListener('change', function () { setupPin(); updateScrollEffects(); });
  window.addEventListener('load', function () { setupPin(); updateScrollEffects(); });
  setupPin();
  updateScrollEffects();

  /* ---------- タブ(募集要項など) ---------- */
  function initTabs(root, opts) {
    var panels = Array.prototype.slice.call(root.querySelectorAll(':scope > .tabs__panel, :scope > * > .tabs__panel'));
    var list = root.querySelector('[role="tablist"]');
    if (!list || !panels.length) return null;
    var buttons = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    panels.forEach(function (p) {
      var t = p.querySelector('.tabs__panel-title');
      if (t) t.classList.add('is-tab-title');
    });
    function select(id, focus, animate) {
      buttons.forEach(function (b) {
        var on = b.getAttribute('aria-controls') === id;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      panels.forEach(function (p) {
        var on = p.id === id;
        p.hidden = !on;
        p.classList.toggle('is-shown', on && !!animate);
      });
      if (opts && opts.onChange) opts.onChange(id);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.getAttribute('aria-controls'), false, true); });
      b.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = buttons.length - 1;
        if (n !== null) {
          e.preventDefault();
          select(buttons[n].getAttribute('aria-controls'), true, true);
        }
      });
    });
    var initial = (opts && opts.initial) || buttons[0].getAttribute('aria-controls');
    select(initial, false, false);
    return { select: select };
  }
  window.ikInitTabs = initTabs;
  document.querySelectorAll('[data-tabs]:not([data-tabs="manual"])').forEach(function (el) { initTabs(el); });

  /* ---------- 社員の写真の帯:止める/動かす ---------- */
  var marquee = document.querySelector('.marquee');
  var marqueeToggle = document.querySelector('.marquee__toggle');
  if (marquee && marqueeToggle) {
    marqueeToggle.addEventListener('click', function () {
      var paused = marquee.classList.toggle('is-paused');
      marqueeToggle.setAttribute('aria-pressed', String(paused));
      marqueeToggle.querySelector('span').textContent = paused ? '写真の動きを再開する' : '写真の動きを止める';
    });
  }

  /* ---------- 加工事例の詳しい表示(アバウト) ---------- */
  var dialog = document.getElementById('work-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-work]'));
    var current = 0;
    var lastFocus = null;
    function fill(i) {
      current = (i + cards.length) % cards.length;
      var c = cards[current];
      var card = c.closest('.work-card');
      var d = c.dataset;
      var img = dialog.querySelector('[data-w="img"]');
      img.src = c.querySelector('img').getAttribute('src');
      img.alt = c.querySelector('img').getAttribute('alt');
      dialog.querySelector('[data-w="no"]').textContent = 'WORKS ' + String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      dialog.querySelector('[data-w="title"]').textContent = card.querySelector('.work-card__title').textContent;
      dialog.querySelector('[data-w="industry"]').textContent = d.industry;
      dialog.querySelector('[data-w="material"]').textContent = d.material;
      dialog.querySelector('[data-w="method"]').textContent = d.method;
      dialog.querySelector('[data-w="size"]').textContent = d.size;
      dialog.querySelector('[data-w="lot"]').textContent = d.lot;
      dialog.querySelector('[data-w="point"]').textContent = card.querySelector('.work-card__point').textContent;
      dialog.querySelector('[data-w="detail"]').textContent = d.detail;
    }
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () {
        lastFocus = c;
        fill(i);
        dialog.showModal();
        document.body.classList.add('is-locked');
      });
    });
    dialog.querySelector('[data-w="close"]').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('[data-w="prev"]').addEventListener('click', function () { fill(current - 1); });
    dialog.querySelector('[data-w="next"]').addEventListener('click', function () { fill(current + 1); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') fill(current + 1);
      if (e.key === 'ArrowLeft') fill(current - 1);
    });
    dialog.addEventListener('close', function () {
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    });
  }

  /* ---------- 採用ページ:どこまで読んだか ---------- */
  if (pageName === 'recruit') {
    var marks = [50, 75, 90];
    var sent = {};
    window.addEventListener('scroll', function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      var pct = (window.scrollY / h) * 100;
      marks.forEach(function (m) {
        if (pct >= m && !sent[m]) {
          sent[m] = true;
          track('scroll_depth', { percent: m });
        }
      });
    }, { passive: true });
  }
})();
