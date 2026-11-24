(function () {
  try { const t = localStorage.getItem('deckTheme'); if (t) document.documentElement.dataset.theme = t; } catch (err) {}
  if (/light/.test(location.search)) document.documentElement.dataset.theme = 'light';
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  let cur = 0, step = 0, notesWin = null;

  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720) * 0.98;
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  const maxStep = el => Math.max(0, ...[...el.querySelectorAll('[data-f],[data-hide]')].map(n => +(n.dataset.f || 0)), ...[...el.querySelectorAll('[data-hide]')].map(n => +n.dataset.hide));

  function render() {
    slides.forEach((s, i) => s.classList.toggle('active', i === cur));
    const s = slides[cur];
    if (/preview/.test(location.search)) step = maxStep(s);
    s.querySelectorAll('.frag').forEach(n => {
      const f = +(n.dataset.f || 0);
      const h = n.dataset.hide ? +n.dataset.hide : Infinity;
      n.classList.toggle('on', step >= f && step < h);
    });
    s.querySelectorAll('[data-win]').forEach(n => n.classList.toggle('on2', step >= +n.dataset.win));
    document.getElementById('hint').textContent = (cur + 1) + ' / ' + slides.length + '  ·  ← → or click  ·  F full screen  ·  T theme  ·  P notes  ·  W wrap-up';
    if (notesWin && !notesWin.closed) {
      const n = s.querySelector('aside.notes');
      const nx = slides[cur + 1];
      const title = el => { const h = el && el.querySelector('h1'); return h ? h.textContent.trim() : (el ? '(no title)' : 'End of deck'); };
      notesWin.document.getElementById('pos').textContent = 'Slide ' + (cur + 1) + ' / ' + slides.length + '  ·  click ' + step + ' / ' + maxStep(s);
      notesWin.document.getElementById('now').textContent = title(s);
      notesWin.document.getElementById('notes').textContent = n ? n.textContent : 'No notes for this slide.';
      notesWin.document.getElementById('next').textContent = 'Next: ' + title(nx);
    }
    document.getElementById('progress').style.width = ((cur + 1) / slides.length * 100) + '%';
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) {}
  }

  function next() {
    if (step < maxStep(slides[cur])) step++;
    else if (cur < slides.length - 1) { cur++; step = 0; }
    render();
  }
  function prev() {
    if (step > 0) step--;
    else if (cur > 0) { cur--; step = maxStep(slides[cur]); }
    render();
  }

  document.addEventListener('keydown', e => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'w' || e.key === 'W') { const i = slides.findIndex(x => x.dataset.id === 'wrap'); if (i >= 0) { cur = i; step = 0; render(); } }
    else if (e.key === 't' || e.key === 'T') { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('deckTheme', r.dataset.theme); } catch (err) {} }
    else if (e.key === 'p' || e.key === 'P') {
      notesWin = window.open('', 'deckNotes', 'width=560,height=520');
      if (notesWin) {
        const d = notesWin.document;
        d.title = 'Presenter notes';
        d.body.innerHTML = '';
        d.body.style.cssText = 'margin:0;padding:24px;background:#0B0D12;color:#F3F4F7;font-family:Poppins,system-ui,sans-serif';
        const mk = (tag, id, css, text) => { const el = d.createElement(tag); if (id) el.id = id; el.style.cssText = css; if (text) el.textContent = text; d.body.appendChild(el); return el; };
        mk('div', 'pos', 'font-size:12px;letter-spacing:1.5px;color:#8A91A3;text-transform:uppercase');
        mk('h2', 'now', 'margin:8px 0 14px;font-size:22px');
        mk('div', 'notes', 'font-size:18px;line-height:1.6;white-space:pre-wrap;color:#C9CED9');
        mk('p', 'next', 'margin-top:24px;font-size:14px;color:#9DB8FF');
        mk('p', '', 'font-size:12px;color:#8A91A3;margin-top:20px', 'Keep this window off the shared screen. Navigate from the slides window.');
        render();
      }
    }
    else if (e.key === 'Home') { cur = 0; step = 0; render(); }
    else if (e.key === 'End') { cur = slides.length - 1; step = 0; render(); }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
    }
  });
  document.getElementById('viewport').addEventListener('click', e => {
    if (e.target.closest('.timer, button, a')) return;
    (e.clientX > window.innerWidth / 3) ? next() : prev();
  });

  // timers
  document.querySelectorAll('.timer').forEach(t => {
    const total = +t.dataset.sec; let left = total, id = null;
    const show = () => t.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    t.addEventListener('click', () => {
      if (t.classList.contains('done')) { left = total; t.classList.remove('done'); show(); return; }
      if (id) { clearInterval(id); id = null; t.classList.remove('running'); return; }
      t.classList.add('running');
      id = setInterval(() => {
        left--; show();
        if (left <= 0) { clearInterval(id); id = null; t.classList.remove('running'); t.classList.add('done'); }
      }, 1000);
    });
    show();
  });

  // copy buttons (generic)
  document.querySelectorAll('.copybtn').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.target); const txt = el.innerText || el.textContent;
    const msg = b.parentElement.querySelector('.copymsg');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => { if (msg) msg.textContent = 'Copied. Paste it into the chat.'; })
      .catch(() => { if (msg) msg.textContent = 'Select the text above and copy it manually.'; });
  }));

  // copy template
  document.getElementById('copyTpl').addEventListener('click', () => {
    const txt = document.getElementById('tpl').innerText;
    const msg = document.getElementById('copyMsg');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => msg.textContent = 'Copied. Paste it into the chat for participants.')
      .catch(() => msg.textContent = 'Select the text above and copy it manually.');
  });

  const h = parseInt(location.hash.slice(1), 10);
  if (h >= 1 && h <= slides.length) cur = h - 1;
  render();
})();
