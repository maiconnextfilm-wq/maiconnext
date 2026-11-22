/* Next Color — interface. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const PREVIEW_MAX = 1400, ANALYSIS_MAX = 256, THUMB_MAX = 160;
  const S = {
    P: CM.defaultParams(),
    ctx: { transfer: null, clone: null, cube: null },
    src: null, ref: null, // canvases em resolução cheia (limitada)
    srcStats: null, refStats: null,
    origData: null, outData: null, thumb: null,
    lut: null, look: -1, curveCh: 'm', hslSel: 0, split: false, splitPos: 0.5,
  };

  // ---------- utilidades ----------
  function toast(msg, ms = 2600) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
  }
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const slug = (s) => (s || 'look').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'look';
  function canvasFrom(src, max) {
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  const dataOf = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
  function loadImageFile(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Não consegui abrir essa imagem. Use JPG, PNG, WEBP ou HEIC exportado como JPG.'));
      img.src = url;
    });
  }

  // ---------- drop zones ----------
  function setupDrop(el, onFiles) {
    const input = $('input', el);
    input.addEventListener('change', () => { if (input.files.length) onFiles([...input.files]); input.value = ''; });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('over'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
  }
  function showInDrop(el, canvas) {
    const img = $('img', el); img.src = canvasFrom(canvas, 600).toDataURL('image/jpeg', 0.85); img.hidden = false; el.classList.add('filled');
  }

  // ---------- imagens ----------
  function setSource(canvas) {
    S.src = canvasFrom(canvas, 4096);
    const prev = canvasFrom(S.src, PREVIEW_MAX);
    const o = $('#cv-orig'), out = $('#cv-out');
    o.width = out.width = prev.width; o.height = out.height = prev.height;
    o.getContext('2d').drawImage(prev, 0, 0);
    S.origData = dataOf(o);
    S.outData = new ImageData(prev.width, prev.height);
    S.srcStats = CM.analyze(dataOf(canvasFrom(S.src, ANALYSIS_MAX)));
    S.thumb = dataOf(canvasFrom(S.src, THUMB_MAX));
    showInDrop($('#drop-src'), S.src);
    $('#empty').hidden = true; $('#compare').hidden = false;
    ['#btn-cube', '#btn-xmp', '#btn-jpg'].forEach((s) => ($(s).disabled = false));
    rebuildTransfer();
    renderThumbs();
    render();
    if (window.innerWidth < 1000) setTimeout(() => $('#viewer').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  function setReference(canvas) {
    S.ref = canvasFrom(canvas, 1200);
    S.refStats = CM.analyze(dataOf(canvasFrom(S.ref, ANALYSIS_MAX)));
    showInDrop($('#drop-ref'), S.ref);
    rebuildTransfer();
    // escolher uma referência = trabalhar a partir dela (mantém os ajustes finos)
    S.P.base = 'ref'; S.look = -1; markLook();
    buildSliders(); render();
  }
  function rebuildTransfer() {
    S.ctx.transfer = S.srcStats && S.refStats ? CM.buildTransfer(S.srcStats, S.refStats) : null;
  }

  setupDrop($('#drop-src'), async ([f]) => { try { setSource(await loadImageFile(f)); } catch (e) { toast(e.message); } });
  setupDrop($('#drop-ref'), async ([f]) => { try { setReference(await loadImageFile(f)); } catch (e) { toast(e.message); } });

  // imagens de exemplo geradas no próprio navegador (sem arquivos externos)
  function demoImage(kind) {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const g = c.getContext('2d');
    const W = c.width, H = c.height;
    if (kind === 'src') {
      let gr = g.createLinearGradient(0, 0, 0, H * 0.6); gr.addColorStop(0, '#8fb3d9'); gr.addColorStop(1, '#dfe7ee'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(W * 0.72, H * 0.22, 60, 0, 7); g.fill();
      g.fillStyle = '#7d8f9c'; g.beginPath(); g.moveTo(0, H * .55); g.lineTo(W * .25, H * .3); g.lineTo(W * .45, H * .5); g.lineTo(W * .7, H * .28); g.lineTo(W, H * .5); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      gr = g.createLinearGradient(0, H * .5, 0, H); gr.addColorStop(0, '#6f9a52'); gr.addColorStop(1, '#3d5a2c'); g.fillStyle = gr; g.fillRect(0, H * .58, W, H);
      g.fillStyle = '#8a8478'; g.beginPath(); g.moveTo(W * .45, H * .58); g.lineTo(W * .55, H * .58); g.lineTo(W * .8, H); g.lineTo(W * .2, H); g.fill();
      g.fillStyle = '#c9463d'; g.fillRect(W * .12, H * .5, 120, 90); g.fillStyle = '#5b3b2a'; g.beginPath(); g.moveTo(W * .12 - 10, H * .5); g.lineTo(W * .12 + 60, H * .43); g.lineTo(W * .12 + 130, H * .5); g.fill();
      g.fillStyle = '#e8c39e'; g.beginPath(); g.arc(W * .82, H * .62, 26, 0, 7); g.fill(); g.fillStyle = '#2f5d9e'; g.fillRect(W * .82 - 28, H * .62 + 26, 56, 110);
      g.fillStyle = '#f2d24b'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * W, H * .7 + Math.random() * H * .3, 4 + Math.random() * 4, 0, 7); g.fill(); }
    } else {
      let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1d2f4a'); gr.addColorStop(.45, '#c8693a'); gr.addColorStop(.62, '#f2b366'); gr.addColorStop(1, '#2a1a1a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(W * .5, H * .58, 70, 0, 7); g.fill();
      g.fillStyle = '#16303a'; g.beginPath(); g.moveTo(0, H * .7); g.lineTo(W * .3, H * .55); g.lineTo(W * .55, H * .68); g.lineTo(W * .8, H * .52); g.lineTo(W, H * .66); g.lineTo(W, H); g.lineTo(0, H); g.fill();
      g.fillStyle = '#0d1d24'; g.fillRect(0, H * .8, W, H);
    }
    const id = g.getImageData(0, 0, W, H), d = id.data; // granulação leve
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(id, 0, 0);
    return c;
  }
  $('#btn-demo').addEventListener('click', () => { setSource(demoImage('src')); setReference(demoImage('ref')); toast('Exemplo carregado. Troque pelas suas imagens quando quiser.'); });

  // ---------- render ----------
  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      S.lut = CM.buildLUT(S.P, S.ctx, 33);
      if (!S.origData) return;
      CM.applyLUT(S.lut, S.origData.data, S.outData.data);
      $('#cv-out').getContext('2d').putImageData(S.outData, 0, 0);
      updateBaseLabel();
      if (document.body.classList.contains('pro')) drawHisto();
    });
  }
  function updateBaseLabel() {
    const P = S.P, map = {
      none: S.look >= 0 ? `Look: ${LOOKS[S.look].name}` : 'Base: só os ajustes',
      ref: S.ctx.transfer ? 'Base: cor da referência' : 'Base: envie uma referência',
      clone: 'Base: LUT clonada', cube: `Base: LUT importada${S.ctx.cube && S.ctx.cube.title ? ' · ' + S.ctx.cube.title : ''}`,
    };
    $('#base-label').textContent = map[P.base] || '';
  }

  // ---------- comparação antes/depois ----------
  const cmp = $('#compare');
  function applySplit() {
    $('#cv-out').style.clipPath = S.split ? `inset(0 0 0 ${S.splitPos * 100}%)` : 'none';
    $('#divider').style.left = S.splitPos * 100 + '%';
    cmp.classList.toggle('split', S.split);
    $('#btn-compare').classList.toggle('on', S.split);
  }
  $('#btn-compare').addEventListener('click', () => { S.split = !S.split; applySplit(); });
  let dragging = false;
  const moveSplit = (e) => { const r = cmp.getBoundingClientRect(); S.splitPos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); applySplit(); };
  cmp.addEventListener('pointerdown', (e) => { if (!S.split) return; dragging = true; cmp.setPointerCapture(e.pointerId); moveSplit(e); });
  cmp.addEventListener('pointermove', (e) => dragging && moveSplit(e));
  cmp.addEventListener('pointerup', () => (dragging = false));
  // segurar a imagem (sem modo comparar) mostra o original
  cmp.addEventListener('pointerdown', () => { if (!S.split) $('#cv-out').style.opacity = 0; });
  window.addEventListener('pointerup', () => ($('#cv-out').style.opacity = 1));

  // ---------- sliders ----------
  const pct = (v) => Math.round(v * 100) + '%';
  const sgn = (v) => (v > 0 ? '+' : '') + Math.round(v * 100);
  const SIMPLE = [
    { k: 'tone', label: 'Luz da referência', min: 0, max: 1, def: 0.8, fmt: pct, only: 'ref' },
    { k: 'color', label: 'Cor da referência', min: 0, max: 1, def: 1, fmt: pct, only: 'ref' },
    { k: 'intensity', label: 'Intensidade do look', min: 0, max: 1, def: 1, fmt: pct },
    { k: 'exposure', label: 'Exposição', min: -2, max: 2, def: 0, fmt: (v) => (v > 0 ? '+' : '') + v.toFixed(2) + ' EV' },
    { k: 'contrast', label: 'Contraste', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'highlights', label: 'Realces', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'shadows', label: 'Sombras', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'temp', label: 'Temperatura', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'tint', label: 'Matiz (verde ↔ magenta)', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'saturation', label: 'Saturação', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'vibrance', label: 'Vibração', min: -1, max: 1, def: 0, fmt: sgn },
    { k: 'fade', label: 'Fade (pretos lavados)', min: 0, max: 1, def: 0, fmt: pct },
  ];
  const SPLIT = [
    { k: 'shHue', label: 'Cor das sombras', min: 0, max: 360, step: 1, def: 200, fmt: (v) => Math.round(v) + '°', hue: true },
    { k: 'shAmt', label: 'Força nas sombras', min: 0, max: 1, def: 0, fmt: pct },
    { k: 'hiHue', label: 'Cor dos realces', min: 0, max: 360, step: 1, def: 40, fmt: (v) => Math.round(v) + '°', hue: true },
    { k: 'hiAmt', label: 'Força nos realces', min: 0, max: 1, def: 0, fmt: pct },
  ];
  function sliderRow(def, get, set) {
    const row = document.createElement('div'); row.className = 'row' + (def.hue ? ' hue' : '');
    row.innerHTML = `<div class="lbl"><span>${def.label}</span><output></output></div><input type="range" min="${def.min}" max="${def.max}" step="${def.step || 0.01}">`;
    const inp = $('input', row), out = $('output', row);
    const sync = () => { inp.value = get(); out.textContent = def.fmt(+inp.value); };
    inp.addEventListener('input', () => { set(+inp.value); out.textContent = def.fmt(+inp.value); render(); });
    inp.addEventListener('dblclick', () => { set(def.def); sync(); render(); });
    row.title = 'Toque duas vezes no controle para voltar ao padrão';
    sync();
    return row;
  }
  function buildSliders() {
    const box = $('#sliders'); box.innerHTML = '';
    SIMPLE.filter((d) => !d.only || d.only === S.P.base).forEach((d) => box.appendChild(sliderRow(d, () => S.P[d.k], (v) => (S.P[d.k] = v))));
    const sp = $('#split'); sp.innerHTML = '';
    SPLIT.forEach((d) => sp.appendChild(sliderRow(d, () => S.P[d.k], (v) => (S.P[d.k] = v))));
    buildHSL();
    drawCurve();
  }

  // ---------- HSL ----------
  const HSL_PT = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Aqua', 'Azul', 'Roxo', 'Magenta'];
  const HSL_COL = ['#ff4b4b', '#ff9a3d', '#ffe14b', '#4ade80', '#3dd6e0', '#4b7bff', '#9b5cff', '#ff4bd2'];
  function buildHSL() {
    const chips = $('#hsl-chips'); chips.innerHTML = '';
    HSL_PT.forEach((n, i) => {
      const b = document.createElement('button'); b.className = 'chip' + (i === S.hslSel ? ' active' : ''); b.style.setProperty('--c', HSL_COL[i]); b.textContent = n;
      b.addEventListener('click', () => { S.hslSel = i; buildHSL(); });
      chips.appendChild(b);
    });
    const box = $('#hsl-sliders'); box.innerHTML = ''; const i = S.hslSel;
    [['hslHue', 'Matiz'], ['hslSat', 'Saturação'], ['hslLum', 'Luminância']].forEach(([k, label]) =>
      box.appendChild(sliderRow({ label, min: -1, max: 1, def: 0, fmt: sgn }, () => S.P[k][i], (v) => (S.P[k][i] = v))));
  }

  // ---------- curvas ----------
  const curveCv = $('#curve'), cg = curveCv.getContext('2d');
  const CH_COL = { m: '#ffffff', r: '#ff5a5a', g: '#4ade80', b: '#60a5fa' };
  function drawCurve() {
    const W = curveCv.width, H = curveCv.height; cg.clearRect(0, 0, W, H);
    cg.strokeStyle = '#232733'; cg.lineWidth = 1;
    for (let i = 1; i < 4; i++) { cg.beginPath(); cg.moveTo((i * W) / 4, 0); cg.lineTo((i * W) / 4, H); cg.moveTo(0, (i * H) / 4); cg.lineTo(W, (i * H) / 4); cg.stroke(); }
    cg.strokeStyle = '#3a3f4d'; cg.beginPath(); cg.moveTo(0, H); cg.lineTo(W, 0); cg.stroke();
    ['m', 'r', 'g', 'b'].forEach((ch) => {
      const pts = S.P.curves[ch]; const active = ch === S.curveCh;
      if (!active && pts.length === 2 && pts[0][1] === 0 && pts[1][1] === 1 && pts[0][0] === 0 && pts[1][0] === 1) return;
      const t = CM.curveTable(pts, 256);
      cg.strokeStyle = CH_COL[ch]; cg.globalAlpha = active ? 1 : 0.35; cg.lineWidth = active ? 3 : 2; cg.beginPath();
      for (let i = 0; i < 256; i++) { const x = (i / 255) * W, y = H - t[i] * H; i ? cg.lineTo(x, y) : cg.moveTo(x, y); }
      cg.stroke(); cg.globalAlpha = 1;
      if (active) pts.forEach((p) => { cg.fillStyle = '#0e1015'; cg.strokeStyle = CH_COL[ch]; cg.lineWidth = 3; cg.beginPath(); cg.arc(p[0] * W, H - p[1] * H, 9, 0, 7); cg.fill(); cg.stroke(); });
    });
  }
  $$('#curve-chips .chip').forEach((b) => b.addEventListener('click', () => {
    S.curveCh = b.dataset.ch; $$('#curve-chips .chip').forEach((x) => x.classList.toggle('active', x === b)); drawCurve();
  }));
  let dragPt = -1, lastTap = 0;
  const curvePos = (e) => { const r = curveCv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))]; };
  curveCv.addEventListener('pointerdown', (e) => {
    const [x, y] = curvePos(e), pts = S.P.curves[S.curveCh];
    let best = -1, bd = 0.05;
    pts.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
    const now = Date.now();
    if (best >= 0 && now - lastTap < 350 && best !== 0 && best !== pts.length - 1) { pts.splice(best, 1); dragPt = -1; drawCurve(); render(); return; }
    lastTap = now;
    if (best < 0) { pts.push([x, y]); pts.sort((a, b) => a[0] - b[0]); best = pts.findIndex((p) => p[0] === x && p[1] === y); }
    dragPt = best; curveCv.setPointerCapture(e.pointerId); drawCurve(); render();
  });
  curveCv.addEventListener('pointermove', (e) => {
    if (dragPt < 0) return;
    const pts = S.P.curves[S.curveCh]; let [x, y] = curvePos(e);
    const lo = dragPt > 0 ? pts[dragPt - 1][0] + 0.01 : 0, hi = dragPt < pts.length - 1 ? pts[dragPt + 1][0] - 0.01 : 1;
    if (dragPt === 0) x = Math.min(x, hi); else if (dragPt === pts.length - 1) x = Math.max(x, lo); else x = Math.max(lo, Math.min(hi, x));
    pts[dragPt] = [x, y]; drawCurve(); render();
  });
  curveCv.addEventListener('pointerup', () => (dragPt = -1));

  // ---------- histograma ----------
  function drawHisto() {
    const cv = $('#histo'), g = cv.getContext('2d'), W = cv.width, H = cv.height, d = S.outData.data;
    const h = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let p = 0; p < d.length; p += 16) { h[0][d[p]]++; h[1][d[p + 1]]++; h[2][d[p + 2]]++; }
    let mx = 1; h.forEach((a) => { for (let i = 1; i < 255; i++) mx = Math.max(mx, a[i]); });
    g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    ['#ff3b3b', '#3bff6a', '#3b7bff'].forEach((c, ch) => {
      g.fillStyle = c; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(0, H);
      for (let i = 0; i < 256; i++) g.lineTo((i / 255) * W, H - Math.min(1, h[ch][i] / mx) * (H - 4));
      g.lineTo(W, H); g.fill();
    });
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  // ---------- looks ----------
  function lookParams(i) { const P = CM.defaultParams(); Object.assign(P, clone(LOOKS[i].p)); return P; }
  function buildLooks() {
    const box = $('#looks'); box.innerHTML = '';
    LOOKS.forEach((L, i) => {
      const b = document.createElement('button'); b.className = 'look'; b.innerHTML = `<div class="th"></div><span>${L.name}</span>`;
      b.addEventListener('click', () => {
        if (!S.src) { toast('Envie sua imagem primeiro para ver o look nela.'); }
        S.P = lookParams(i); S.look = i; markLook(); buildSliders(); render();
      });
      box.appendChild(b);
    });
  }
  function markLook() { $$('#looks .look').forEach((b, i) => b.classList.toggle('active', i === S.look)); }
  function renderThumbs() {
    if (!S.thumb) return;
    const c = document.createElement('canvas'); c.width = S.thumb.width; c.height = S.thumb.height;
    const out = new ImageData(c.width, c.height), g = c.getContext('2d');
    const thumbs = $$('#looks .th');
    let i = 0;
    const step = () => { // um por quadro para não travar a tela
      if (i >= LOOKS.length) return;
      CM.applyLUT(CM.buildLUT(lookParams(i), {}, 17), S.thumb.data, out.data);
      g.putImageData(out, 0, 0); thumbs[i].style.backgroundImage = `url(${c.toDataURL('image/jpeg', 0.8)})`;
      i++; requestAnimationFrame(step);
    };
    step();
  }

  // ---------- reset / modo / abas ----------
  $('#btn-reset').addEventListener('click', () => {
    const base = S.P.base; S.P = CM.defaultParams(); S.P.base = base === 'none' ? 'none' : base; S.look = -1; markLook(); buildSliders(); render();
  });
  $$('.seg').forEach((b) => b.addEventListener('click', () => {
    $$('.seg').forEach((x) => x.classList.toggle('active', x === b));
    document.body.classList.toggle('pro', b.dataset.mode === 'pro');
    drawCurve(); render();
  }));
  function showTab(name) {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    $('.mode').style.visibility = name === 'create' ? 'visible' : 'hidden';
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ---------- exportar ----------
  const lookName = () => $('#look-name').value.trim() || 'Meu look';
  $('#btn-cube').addEventListener('click', () => {
    download(slug(lookName()) + '.cube', CM.toCube(CM.buildLUT(S.P, S.ctx, 33), lookName()), 'text/plain');
    toast('LUT .cube baixada. Importe no seu editor de vídeo.');
  });
  $('#btn-xmp').addEventListener('click', () => {
    download(slug(lookName()) + '.xmp', CM.toXMP(CM.buildLUT(S.P, S.ctx, 33), lookName()), 'application/rdf+xml');
    toast('Preset .xmp baixado. No Lightroom: Predefinições › Importar.');
  });
  $('#btn-jpg').addEventListener('click', () => {
    const c = document.createElement('canvas'); c.width = S.src.width; c.height = S.src.height;
    const g = c.getContext('2d'); g.drawImage(S.src, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height); CM.applyLUT(CM.buildLUT(S.P, S.ctx, 33), id.data, id.data); g.putImageData(id, 0, 0);
    c.toBlob((b) => download(slug(lookName()) + '.jpg', b), 'image/jpeg', 0.92);
  });

  // ---------- clonar LUT ----------
  const CL = { before: null, after: null };
  function clonePick(key, el) {
    setupDrop(el, async ([f]) => {
      try { CL[key] = canvasFrom(await loadImageFile(f), 4096); showInDrop(el, CL[key]); $('#btn-clone').disabled = !(CL.before && CL.after); }
      catch (e) { toast(e.message); }
    });
  }
  clonePick('before', $('#drop-before')); clonePick('after', $('#drop-after'));
  $('#btn-clone').addEventListener('click', () => {
    const a = canvasFrom(CL.before, 480);
    const b = document.createElement('canvas'); b.width = a.width; b.height = a.height; b.getContext('2d').drawImage(CL.after, 0, 0, a.width, a.height);
    const ra = CL.before.width / CL.before.height, rb = CL.after.width / CL.after.height;
    if (Math.abs(ra - rb) > 0.02) toast('Atenção: antes e depois têm proporções diferentes. Use o mesmo frame para um resultado fiel.', 4500);
    S.ctx.clone = CM.buildCloneLUT(dataOf(a), dataOf(b), 17);
    if (!S.src) setSource(CL.before);
    S.P = CM.defaultParams(); S.P.base = 'clone'; S.look = -1; markLook();
    $('#look-name').value = 'LUT clonada';
    buildSliders(); render(); showTab('create');
    toast(`LUT clonada (${Math.round(S.ctx.clone.coverage * 100)}% do cubo de cores coberto pelo frame). Ajuste e exporte.`, 4000);
  });

  // ---------- converter ----------
  const results = $('#bridge-results');
  function addResult(name, actions, err) {
    const li = document.createElement('li'); if (err) li.className = 'err';
    li.innerHTML = `<span class="nm"></span>`; $('.nm', li).textContent = name + (err ? ' — ' + err : '');
    (actions || []).forEach(([label, fn]) => { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = label; b.addEventListener('click', fn); li.appendChild(b); });
    results.prepend(li);
  }
  function openInEditor(setup, name) {
    setup(); $('#look-name').value = name; S.look = -1; markLook(); buildSliders(); render(); showTab('create');
    if (!S.src) toast('Envie uma imagem para visualizar o look.');
  }
  setupDrop($('#drop-cube'), (files) => files.forEach(async (f) => {
    const base = f.name.replace(/\.cube$/i, '');
    try {
      const L = CM.parseCube(await f.text());
      addResult(f.name, [
        ['Baixar .xmp', () => download(slug(base) + '.xmp', CM.toXMP(L, base), 'application/rdf+xml')],
        ['Abrir no editor', () => openInEditor(() => { S.ctx.cube = L; S.P = CM.defaultParams(); S.P.base = 'cube'; }, base)],
      ]);
    } catch (e) { addResult(f.name, [], e.message); }
  }));
  setupDrop($('#drop-xmp'), (files) => files.forEach(async (f) => {
    const base = f.name.replace(/\.(xmp|dng)$/i, '');
    try {
      const buf = await f.arrayBuffer();
      const text = new TextDecoder('latin1').decode(new Uint8Array(buf));
      const { params, name } = CM.parseXMP(text);
      const nm = name || base;
      addResult(f.name + (name ? ` (${name})` : ''), [
        ['Baixar .cube', () => download(slug(nm) + '.cube', CM.toCube(CM.buildLUT(params, {}, 33), nm), 'text/plain')],
        ['Abrir no editor', () => openInEditor(() => { S.P = clone(params); S.P.base = 'none'; }, nm)],
      ]);
    } catch (e) { addResult(f.name, [], e.message); }
  }));

  // ---------- aspect ratio ----------
  function ratioVal() { const v = $('#ar-ratio').value; return v === 'custom' ? Math.max(0.1, +$('#ar-cw').value || 1) : +v; }
  const even = (v) => Math.max(2, Math.round(v / 2) * 2);
  let arLast = 'w';
  function updateAR() {
    $('#ar-custom').hidden = $('#ar-ratio').value !== 'custom';
    const r = ratioVal(); let w = +$('#ar-w').value, h = +$('#ar-h').value;
    if (arLast === 'w' && w) { h = even(w / r); $('#ar-h').value = h; } else if (h) { w = even(h * r); $('#ar-w').value = w; }
    const mp = ((w * h) / 1e6).toFixed(2);
    $('#ar-out').innerHTML = `<div><b>${w} × ${h}</b><span>resolução (arredondada para número par)</span></div><div><b>${r.toFixed(3)}:1</b><span>proporção</span></div><div><b>${mp} MP</b><span>megapixels</span></div>`;
    const [fw, fh] = $('#ar-frame').value.split('x').map(Number), fr = fw / fh;
    let iw, ih, bars;
    if (r >= fr) { iw = fw; ih = even(fw / r); const t = (fh - ih) / 2; bars = `<div><b>${Math.round(t)} px</b><span>barra em cima e embaixo</span></div>`; }
    else { ih = fh; iw = even(fh * r); const t = (fw - iw) / 2; bars = `<div><b>${Math.round(t)} px</b><span>barra em cada lateral</span></div>`; }
    $('#ar-bars').innerHTML = `<div><b>${iw} × ${ih}</b><span>área da imagem dentro de ${fw} × ${fh}</span></div>${bars}`;
    const boxW = Math.min(520, window.innerWidth - 80), k = Math.min(boxW / fw, 300 / fh);
    Object.assign($('#ar-preview').style, { width: fw * k + 'px', height: fh * k + 'px' });
    Object.assign($('#ar-inner').style, { width: iw * k + 'px', height: ih * k + 'px' });
  }
  $('#ar-w').addEventListener('input', () => { arLast = 'w'; updateAR(); });
  $('#ar-h').addEventListener('input', () => { arLast = 'h'; updateAR(); });
  ['#ar-ratio', '#ar-cw', '#ar-frame'].forEach((s) => $(s).addEventListener('input', updateAR));

  // ---------- início ----------
  buildLooks(); buildSliders(); updateAR(); updateBaseLabel();
  window.__NC = S; // para depuração
})();
