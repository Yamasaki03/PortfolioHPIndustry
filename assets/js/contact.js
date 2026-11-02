/* お問い合わせフォーム(制作サンプル:フロントエンドの動きだけを再現し、送信はしない)
   - 種類のタブ:?type=business / ?type=recruit で選ばれた状態で開く
   - 入力の確認:必須・メールの形・電話番号を、その場で分かりやすく知らせる
   - 図面の添付:PDF・DXF・JPEG・PNG、3ファイル・合計10MBまで
   - 確認画面 → 送信(見本)→ 送信完了ページへ */
(function () {
  'use strict';

  var MAX_FILES = 3;
  var MAX_TOTAL = 10 * 1024 * 1024;
  var ALLOWED_EXT = ['pdf', 'dxf', 'jpg', 'jpeg', 'png'];
  var track = window.ikTrack || function () {};
  var params = new URLSearchParams(location.search);

  /* ---------- 種類のタブ ---------- */
  var wrap = document.getElementById('contact-forms');
  var initialType = params.get('type') === 'recruit' ? 'recruit' : 'business';
  if (window.ikInitTabs && wrap) {
    window.ikInitTabs(wrap, {
      initial: 'panel-' + initialType,
      onChange: function (id) {
        var type = id.replace('panel-', '');
        var url = new URL(location.href);
        url.searchParams.set('type', type);
        url.searchParams.delete('kind');
        history.replaceState(null, '', url);
      }
    });
  }

  /* 申し込みの種類:?kind=visit / apply / ask */
  var kind = params.get('kind');
  if (kind) {
    var radio = document.querySelector('#form-recruit input[name="kind"][value="' + kind.replace(/[^a-z]/g, '') + '"]');
    if (radio) radio.checked = true;
  }

  /* ---------- 入力の確認 ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function errorEl(field) {
    var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/);
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.classList.contains('field__error')) return el;
    }
    return null;
  }

  function setError(field, message) {
    var el = errorEl(field);
    var target = field.matches('fieldset') ? field.querySelectorAll('input') : [field];
    Array.prototype.forEach.call(target, function (t) {
      if (message) t.setAttribute('aria-invalid', 'true');
      else t.removeAttribute('aria-invalid');
    });
    if (el) {
      el.textContent = message || '';
      el.hidden = !message;
    }
    var row = field.closest('.field');
    if (row) row.classList.toggle('is-valid', !message && field.value !== '' && field.type !== 'checkbox');
  }

  function validateField(field, form) {
    var label = field.getAttribute('data-label') || '';
    var v = typeof field.value === 'string' ? field.value.trim() : '';

    if (field.matches('fieldset[data-required-group]')) {
      var name = field.getAttribute('data-required-group');
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? '' : label + 'を選んでください';
    }
    if (field.type === 'checkbox') {
      return field.required && !field.checked ? 'プライバシーポリシーをご確認のうえ、同意にチェックを入れてください' : '';
    }
    if (field.type === 'file') {
      return fileError(form);
    }
    if (field.required && !v) {
      return label + 'を入力してください';
    }
    if (!v) return '';
    if (field.type === 'email' && !EMAIL_RE.test(v)) {
      return 'メールアドレスの形が正しくありません(例:name@example.co.jp)';
    }
    if (field.type === 'tel') {
      var digits = v.replace(/[‐－―ー-]/g, '-').replace(/[^\d-]/g, 'x');
      if (/x/.test(digits) || !/^0\d{9,10}$/.test(digits.replace(/-/g, ''))) {
        return '電話番号は、数字とハイフンで入力してください(例:06-0000-0000)';
      }
    }
    if (field.type === 'number') {
      var n = Number(v);
      if (!Number.isFinite(n) || n < Number(field.min) || n > Number(field.max)) {
        return '年齢は' + field.min + '〜' + field.max + 'の数字で入力してください';
      }
    }
    return '';
  }

  function checkables(form) {
    return Array.prototype.slice.call(form.querySelectorAll('.form-body [aria-describedby]')).filter(function (f) {
      return errorEl(f) !== null;
    });
  }

  /* ---------- 図面の添付 ---------- */
  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + 'KB';
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  }

  function fileError(form) {
    var files = form._files || [];
    if (files.length > MAX_FILES) return '添付できるのは' + MAX_FILES + 'ファイルまでです(現在' + files.length + 'ファイル)';
    var bad = files.filter(function (f) {
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      return ALLOWED_EXT.indexOf(ext) === -1;
    });
    if (bad.length) return '「' + bad[0].name + '」は添付できない形式です。PDF・DXF・JPEG・PNGでお送りください';
    var total = files.reduce(function (s, f) { return s + f.size; }, 0);
    if (total > MAX_TOTAL) return '合計が10MBを超えています(現在' + formatSize(total) + ')。ファイルを減らすか、FAXでもお送りいただけます';
    return '';
  }

  function setupFiles(form) {
    var input = form.querySelector('input[type="file"]');
    if (!input) return;
    var zone = form.querySelector('[data-dropzone]');
    var list = form.querySelector('[data-file-list]');
    var meter = form.querySelector('[data-file-meter]');
    var meterBar = meter.querySelector('.file-meter__bar span');
    var meterText = meter.querySelector('[data-file-meter-text]');
    form._files = [];

    function sync() {
      if (window.DataTransfer) {
        try {
          var dt = new DataTransfer();
          form._files.forEach(function (f) { dt.items.add(f); });
          input.files = dt.files;
        } catch (e) { /* 古いブラウザでは表示のみ */ }
      }
      list.innerHTML = '';
      form._files.forEach(function (f, i) {
        var li = document.createElement('li');
        var name = document.createElement('span');
        name.className = 'file-list__name';
        name.textContent = f.name;
        var size = document.createElement('span');
        size.className = 'file-list__size';
        size.textContent = formatSize(f.size);
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'file-list__remove';
        rm.setAttribute('aria-label', f.name + 'を取り消す');
        rm.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
        rm.addEventListener('click', function () {
          form._files.splice(i, 1);
          sync();
          input.focus();
        });
        li.appendChild(name);
        li.appendChild(size);
        li.appendChild(rm);
        list.appendChild(li);
      });
      var total = form._files.reduce(function (s, f) { return s + f.size; }, 0);
      meter.hidden = form._files.length === 0;
      meterBar.style.width = Math.min(100, total / MAX_TOTAL * 100) + '%';
      meterText.textContent = formatSize(total) + ' / 10MB(' + form._files.length + '/' + MAX_FILES + 'ファイル)';
      setError(input, fileError(form));
    }

    function add(fileList) {
      Array.prototype.forEach.call(fileList, function (f) {
        var dup = form._files.some(function (g) { return g.name === f.name && g.size === f.size; });
        if (!dup) form._files.push(f);
      });
      sync();
    }

    input.addEventListener('change', function () {
      var picked = Array.prototype.slice.call(input.files);
      add(picked);
    });
    ['dragenter', 'dragover'].forEach(function (t) {
      zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files);
    });
  }

  /* ---------- 確認画面 ---------- */
  function buildConfirm(form) {
    var dl = form.querySelector('[data-confirm-list]');
    dl.innerHTML = '';
    var seen = {};
    form.querySelectorAll('.form-body [data-label]').forEach(function (f) {
      var label = f.getAttribute('data-label');
      if (seen[label]) return;
      seen[label] = true;
      var value = '';
      if (f.matches('fieldset')) {
        var c = f.querySelector('input:checked');
        value = c ? c.nextElementSibling.textContent : '';
      } else if (f.type === 'checkbox') {
        value = f.checked ? '同意する' : '';
      } else if (f.type === 'file') {
        value = (form._files || []).map(function (x) { return x.name + '(' + formatSize(x.size) + ')'; }).join('\n');
      } else if (f.tagName === 'SELECT') {
        value = f.value ? f.options[f.selectedIndex].text : '';
      } else {
        value = f.value.trim();
      }
      var dt = document.createElement('dt');
      dt.textContent = label;
      var dd = document.createElement('dd');
      dd.textContent = value || '(未入力)';
      if (!value) dd.classList.add('is-empty');
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }

  function scrollToForm(form) {
    var top = form.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* ---------- フォームごとの設定 ---------- */
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var type = form.getAttribute('data-form');
    var body = form.querySelector('.form-body');
    var confirm = form.querySelector('.confirm');
    var summary = form.querySelector('.form-error-summary');
    var started = false;
    form.noValidate = true; // JSが動くときは、ブラウザ標準ではなく独自の表示で知らせる

    setupFiles(form);

    form.addEventListener('input', function () {
      if (!started) {
        started = true;
        track('form_start', { form_type: type });
      }
    });

    checkables(form).forEach(function (field) {
      var targets = field.matches('fieldset') ? field.querySelectorAll('input') : [field];
      Array.prototype.forEach.call(targets, function (t) {
        t.addEventListener('blur', function () {
          if (field.type === 'file' || field.type === 'checkbox' || field.matches('fieldset')) return;
          if (t.value.trim() === '' && !t.hasAttribute('aria-invalid')) return; // 入力前は責めない
          setError(field, validateField(field, form));
        });
        t.addEventListener(field.type === 'checkbox' || field.matches('fieldset') ? 'change' : 'input', function () {
          if (t.hasAttribute('aria-invalid') || field.type === 'checkbox' || field.matches('fieldset')) {
            setError(field, validateField(field, form));
          }
        });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = [];
      checkables(form).forEach(function (field) {
        var msg = validateField(field, form);
        setError(field, msg);
        if (msg) errors.push({ field: field, msg: msg });
      });

      if (errors.length) {
        summary.innerHTML = '';
        var p = document.createElement('p');
        p.textContent = errors.length + '件の入力内容をご確認ください。';
        var ul = document.createElement('ul');
        errors.forEach(function (err) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          var focusTarget = err.field.matches('fieldset') ? err.field.querySelector('input') : err.field;
          a.href = '#' + (focusTarget.id || '');
          a.textContent = err.msg;
          a.addEventListener('click', function (ev) {
            ev.preventDefault();
            focusTarget.focus();
          });
          li.appendChild(a);
          ul.appendChild(li);
        });
        summary.appendChild(p);
        summary.appendChild(ul);
        summary.hidden = false;
        scrollToForm(form);
        summary.focus({ preventScroll: true });
        return;
      }

      summary.hidden = true;
      buildConfirm(form);
      body.hidden = true;
      confirm.hidden = false;
      scrollToForm(form);
      confirm.querySelector('[data-send]').focus({ preventScroll: true });
    });

    confirm.querySelector('[data-back]').addEventListener('click', function () {
      confirm.hidden = true;
      body.hidden = false;
      scrollToForm(form);
      var first = body.querySelector('input, textarea, select');
      if (first) first.focus({ preventScroll: true });
    });

    var sending = false;
    confirm.querySelector('[data-send]').addEventListener('click', function () {
      if (sending) return; // 二重送信を防ぐ
      sending = true;
      var btn = this;
      btn.setAttribute('aria-busy', 'true');
      btn.firstChild.textContent = '送信しています…';

      var honeypot = form.querySelector('input[name="website"]');
      var isBot = honeypot && honeypot.value !== '';

      // 実案件ではここでサーバーへ送信する(Turnstileの確認・送信回数の制限もサーバー側で行う)
      setTimeout(function () {
        if (!isBot) {
          track('generate_lead', {
            form_type: type,
            has_attachment: type === 'business' ? (form._files || []).length > 0 : false
          });
        }
        try { sessionStorage.setItem('ik_thanks_type', type); } catch (err) { /* 保存できなくても続ける */ }
        location.href = 'thanks/?type=' + type;
      }, 900);
    });
  });
})();
