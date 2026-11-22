/* Next Color — motor de cor.
 * Tudo aqui é função pura de RGB → RGB, então qualquer look pode virar uma LUT 3D.
 * Valores RGB normalizados em [0,1], espaço sRGB (gamma).
 */
(function (global) {
  'use strict';
  const CM = {};

  // ---------- sRGB <-> linear <-> Lab (D65) ----------
  const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const l2s = (c) => (c <= 0 ? 0 : c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  CM.s2l = s2l;
  CM.l2s = l2s;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  CM.clamp01 = clamp01;
  const XN = 0.95047, ZN = 1.08883;
  const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fLabInv = (t) => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };

  CM.rgb2lab = function (r, g, b, out) {
    r = s2l(r); g = s2l(g); b = s2l(b);
    const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / XN;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / ZN;
    const fx = fLab(x), fy = fLab(y), fz = fLab(z);
    out[0] = 116 * fy - 16; out[1] = 500 * (fx - fy); out[2] = 200 * (fy - fz);
    return out;
  };
  CM.lab2rgb = function (L, a, b, out) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
    const x = fLabInv(fx) * XN, y = fLabInv(fy), z = fLabInv(fz) * ZN;
    out[0] = clamp01(l2s(3.2404542 * x - 1.5371385 * y - 0.4985314 * z));
    out[1] = clamp01(l2s(-0.969266 * x + 1.8760108 * y + 0.041556 * z));
    out[2] = clamp01(l2s(0.0556434 * x - 0.2040259 * y + 1.0572252 * z));
    return out;
  };

  // ---------- HSL ----------
  CM.rgb2hsl = function (r, g, b, out) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    out[0] = h; out[1] = s; out[2] = l;
    return out;
  };
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  CM.hsl2rgb = function (h, s, l, out) {
    if (s <= 0) { out[0] = out[1] = out[2] = l; return out; }
    h = (((h % 360) + 360) % 360) / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    out[0] = hue2rgb(p, q, h + 1 / 3); out[1] = hue2rgb(p, q, h); out[2] = hue2rgb(p, q, h - 1 / 3);
    return out;
  };
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  CM.luma = luma;

  // ---------- Análise de imagem (para transferência de cor) ----------
  const BINS = 256;
  const BAND_C = [15, 50, 85], BAND_SIG = 22;
  const bandW = (L, i) => { const d = L - BAND_C[i]; return Math.exp(-(d * d) / (2 * BAND_SIG * BAND_SIG)); };

  CM.analyze = function (imgData) {
    const d = imgData.data, n = d.length / 4;
    const hist = new Float64Array(BINS);
    const bw = [0, 0, 0], ba = [0, 0, 0], bb = [0, 0, 0];
    let sa = 0, sb = 0;
    const lab = [0, 0, 0];
    const Ls = new Float32Array(n), As = new Float32Array(n), Bs = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      CM.rgb2lab(d[p] / 255, d[p + 1] / 255, d[p + 2] / 255, lab);
      const L = lab[0]; Ls[i] = L; As[i] = lab[1]; Bs[i] = lab[2];
      hist[Math.min(BINS - 1, Math.max(0, Math.floor((L / 100) * BINS)))]++;
      sa += lab[1]; sb += lab[2];
      for (let k = 0; k < 3; k++) { const w = bandW(L, k); bw[k] += w; ba[k] += w * lab[1]; bb[k] += w * lab[2]; }
    }
    const ma = sa / n, mb = sb / n;
    const bandA = [], bandB = [];
    for (let k = 0; k < 3; k++) {
      // banda pouco representada → usa a média global, para não inventar cor
      const conf = Math.min(1, bw[k] / (n * 0.05));
      bandA[k] = bw[k] > 0 ? (ba[k] / bw[k]) * conf + ma * (1 - conf) : ma;
      bandB[k] = bw[k] > 0 ? (bb[k] / bw[k]) * conf + mb * (1 - conf) : mb;
    }
    const stats = { bandA, bandB };
    let v = 0;
    for (let i = 0; i < n; i++) {
      const da = As[i] - CM.bandMean(stats.bandA, Ls[i]), db = Bs[i] - CM.bandMean(stats.bandB, Ls[i]);
      v += da * da + db * db;
    }
    const cdf = new Float64Array(BINS);
    let acc = 0;
    for (let i = 0; i < BINS; i++) { acc += hist[i]; cdf[i] = acc / n; }
    return { cdf, bandA, bandB, chromaStd: Math.sqrt(v / n) };
  };

  CM.bandMean = function (vals, L) {
    let s = 0, w = 0;
    for (let k = 0; k < 3; k++) { const wk = bandW(L, k); s += wk * vals[k]; w += wk; }
    return s / w;
  };

  /** Curva de L (histograma da sua imagem → histograma da referência), suavizada e monotônica. */
  function matchCurve(srcCdf, refCdf) {
    const out = new Float64Array(BINS);
    let j = 0;
    for (let i = 0; i < BINS; i++) {
      const u = srcCdf[i];
      while (j < BINS - 1 && refCdf[j] < u) j++;
      const c1 = refCdf[j], c0 = j > 0 ? refCdf[j - 1] : 0;
      const t = c1 > c0 ? (u - c0) / (c1 - c0) : 0;
      out[i] = ((j + Math.max(0, Math.min(1, t))) / BINS) * 100;
    }
    // suavização gaussiana
    const R = 6, sm = new Float64Array(BINS);
    for (let i = 0; i < BINS; i++) {
      let s = 0, w = 0;
      for (let k = -R; k <= R; k++) {
        const ii = Math.min(BINS - 1, Math.max(0, i + k)), wk = Math.exp(-(k * k) / (2 * 3 * 3));
        s += out[ii] * wk; w += wk;
      }
      sm[i] = s / w;
    }
    for (let i = 1; i < BINS; i++) if (sm[i] < sm[i - 1]) sm[i] = sm[i - 1];
    return sm;
  }

  CM.buildTransfer = function (srcStats, refStats) {
    const k = Math.max(0.4, Math.min(2.5, (refStats.chromaStd + 1e-3) / (srcStats.chromaStd + 1e-3)));
    return { curve: matchCurve(srcStats.cdf, refStats.cdf), k, src: srcStats, ref: refStats };
  };

  function curveAt(curve, L) {
    const x = Math.max(0, Math.min(BINS - 1, (L / 100) * BINS - 0.5));
    const i = Math.floor(x), f = x - i, j = Math.min(BINS - 1, i + 1);
    return curve[i] * (1 - f) + curve[j] * f;
  }

  /** Aplica a transferência a um pixel RGB. tone/color em [0,1]. */
  CM.applyTransfer = function (T, tone, color, rgb, lab) {
    CM.rgb2lab(rgb[0], rgb[1], rgb[2], lab);
    const L = lab[0], a = lab[1], b = lab[2];
    const L2 = L + (curveAt(T.curve, L) - L) * tone;
    const a2 = (a - CM.bandMean(T.src.bandA, L)) * T.k + CM.bandMean(T.ref.bandA, L2);
    const b2 = (b - CM.bandMean(T.src.bandB, L)) * T.k + CM.bandMean(T.ref.bandB, L2);
    CM.lab2rgb(L2, a + (a2 - a) * color, b + (b2 - b) * color, rgb);
  };

  // ---------- Curvas (spline monotônica Fritsch–Carlson) ----------
  CM.curveTable = function (pts, size) {
    size = size || 1024;
    const P = pts.slice().sort((p, q) => p[0] - q[0]);
    const tbl = new Float32Array(size);
    const n = P.length;
    if (n < 2) { for (let i = 0; i < size; i++) tbl[i] = i / (size - 1); return tbl; }
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = Math.max(1e-6, P[i + 1][0] - P[i][0]); dy[i] = (P[i + 1][1] - P[i][1]) / dx[i]; }
    m[0] = dy[0]; m[n - 1] = dy[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (dy[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / dy[i], b = m[i + 1] / dy[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * dy[i]; m[i + 1] = t * b * dy[i]; }
    }
    let seg = 0;
    for (let k = 0; k < size; k++) {
      const x = k / (size - 1);
      if (x <= P[0][0]) { tbl[k] = P[0][1]; continue; }
      if (x >= P[n - 1][0]) { tbl[k] = P[n - 1][1]; continue; }
      while (seg < n - 2 && x > P[seg + 1][0]) seg++;
      const h = dx[seg], t = (x - P[seg][0]) / h, t2 = t * t, t3 = t2 * t;
      tbl[k] = clamp01((2 * t3 - 3 * t2 + 1) * P[seg][1] + (t3 - 2 * t2 + t) * h * m[seg] +
        (-2 * t3 + 3 * t2) * P[seg + 1][1] + (t3 - t2) * h * m[seg + 1]);
    }
    return tbl;
  };
  const isIdentityCurve = (pts) => pts.length === 2 && pts[0][0] === 0 && pts[0][1] === 0 && pts[1][0] === 1 && pts[1][1] === 1;
  const lookup = (tbl, v) => { const x = clamp01(v) * (tbl.length - 1), i = Math.floor(x), j = Math.min(tbl.length - 1, i + 1), f = x - i; return tbl[i] * (1 - f) + tbl[j] * f; };

  // ---------- Parâmetros ----------
  CM.HSL_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];
  CM.HSL_HUES = [0, 30, 60, 120, 180, 240, 270, 300];
  CM.defaultParams = function () {
    return {
      base: 'none', tone: 0.8, color: 1,
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, temp: 0, tint: 0,
      saturation: 0, vibrance: 0, fade: 0, intensity: 1,
      shHue: 200, shAmt: 0, hiHue: 40, hiAmt: 0,
      hslHue: [0, 0, 0, 0, 0, 0, 0, 0], hslSat: [0, 0, 0, 0, 0, 0, 0, 0], hslLum: [0, 0, 0, 0, 0, 0, 0, 0],
      curves: { m: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] },
    };
  };

  function prepare(P) {
    const pr = { curves: null, hsl: false, split: null };
    const c = P.curves;
    if (!(isIdentityCurve(c.m) && isIdentityCurve(c.r) && isIdentityCurve(c.g) && isIdentityCurve(c.b))) {
      pr.curves = [CM.curveTable(c.m), CM.curveTable(c.r), CM.curveTable(c.g), CM.curveTable(c.b)];
    }
    for (let i = 0; i < 8; i++) if (P.hslHue[i] || P.hslSat[i] || P.hslLum[i]) pr.hsl = true;
    if (P.shAmt || P.hiAmt) {
      const tintVec = (h) => { const c = CM.hsl2rgb(h, 1, 0.5, [0, 0, 0]); const y = luma(c[0], c[1], c[2]); return [c[0] - y, c[1] - y, c[2] - y]; };
      pr.split = { sh: tintVec(P.shHue), hi: tintVec(P.hiHue) };
    }
    pr.G = Math.pow(2, P.exposure);
    const ce = 1.6 * P.contrast;
    pr.cp = ce >= 0 ? 1 + ce : 1 / (1 - ce);
    return pr;
  }

  const lab = [0, 0, 0], hsl = [0, 0, 0], tmp = [0, 0, 0];

  /** Pipeline completo de um pixel. rgb é modificado no lugar. */
  function processPixel(rgb, P, pr, ctx) {
    const r0 = rgb[0], g0 = rgb[1], b0 = rgb[2];
    // 1. base: referência / LUT clonada / LUT importada
    if (P.base === 'ref' && ctx.transfer) CM.applyTransfer(ctx.transfer, P.tone, P.color, rgb, lab);
    else if (P.base === 'clone' && ctx.clone) CM.sampleLUT(ctx.clone.data, ctx.clone.size, rgb[0], rgb[1], rgb[2], rgb);
    else if (P.base === 'cube' && ctx.cube) CM.sampleLUT(ctx.cube.data, ctx.cube.size, rgb[0], rgb[1], rgb[2], rgb);

    let r = rgb[0], g = rgb[1], b = rgb[2];
    // 2. exposição + balanço de branco (em luz linear)
    if (P.exposure || P.temp || P.tint) {
      r = s2l(r); g = s2l(g); b = s2l(b);
      const y0 = luma(r, g, b);
      if (P.temp || P.tint) {
        r *= 1 + 0.3 * P.temp; b *= 1 - 0.3 * P.temp; g *= 1 - 0.2 * P.tint;
        const y1 = luma(r, g, b);
        if (y1 > 1e-6) { const k = y0 / y1; r *= k; g *= k; b *= k; }
      }
      if (P.exposure > 0) { const G = pr.G; r = (r * G) / (1 + r * (G - 1)); g = (g * G) / (1 + g * (G - 1)); b = (b * G) / (1 + b * (G - 1)); }
      else if (P.exposure < 0) { r *= pr.G; g *= pr.G; b *= pr.G; }
      r = l2s(r); g = l2s(g); b = l2s(b);
    }
    // 3. contraste (curva em S com pivô no meio)
    if (P.contrast) {
      const p = pr.cp;
      const sc = (x) => { x = clamp01(x); return x < 0.5 ? 0.5 * Math.pow(2 * x, p) : 1 - 0.5 * Math.pow(2 - 2 * x, p); };
      r = sc(r); g = sc(g); b = sc(b);
    }
    // 4. realces e sombras
    if (P.shadows || P.highlights) {
      const sh = P.shadows * 0.9, hi = P.highlights * 0.9;
      const f = (x) => { x = clamp01(x); return x + sh * x * (1 - x) * (1 - x) + hi * x * x * (1 - x); };
      r = f(r); g = f(g); b = f(b);
    }
    // 5. fade (pretos lavados)
    if (P.fade) { const k = P.fade * 0.2; r += k * (1 - r) * (1 - r); g += k * (1 - g) * (1 - g); b += k * (1 - b) * (1 - b); }
    // 6. split toning
    if (pr.split) {
      const y = clamp01(luma(r, g, b)), ws = (1 - y) * (1 - y) * P.shAmt * 0.9, wh = y * y * P.hiAmt * 0.9;
      r += pr.split.sh[0] * ws + pr.split.hi[0] * wh;
      g += pr.split.sh[1] * ws + pr.split.hi[1] * wh;
      b += pr.split.sh[2] * ws + pr.split.hi[2] * wh;
    }
    // 7. curvas
    if (pr.curves) {
      const c = pr.curves;
      r = lookup(c[1], lookup(c[0], r)); g = lookup(c[2], lookup(c[0], g)); b = lookup(c[3], lookup(c[0], b));
    }
    // 8. HSL por cor
    if (pr.hsl) {
      CM.rgb2hsl(clamp01(r), clamp01(g), clamp01(b), hsl);
      let dh = 0, ds = 0, dl = 0;
      for (let i = 0; i < 8; i++) {
        let d = Math.abs(hsl[0] - CM.HSL_HUES[i]); if (d > 180) d = 360 - d;
        const w = Math.max(0, 1 - d / 40);
        if (w > 0) { const ws = w * w * (3 - 2 * w); dh += ws * P.hslHue[i]; ds += ws * P.hslSat[i]; dl += ws * P.hslLum[i]; }
      }
      if (dh || ds || dl) {
        const s = hsl[1];
        CM.hsl2rgb(hsl[0] + dh * 30, clamp01(s * (1 + ds)), clamp01(hsl[2] + dl * 0.25 * s), tmp);
        r = tmp[0]; g = tmp[1]; b = tmp[2];
      }
    }
    // 9. saturação e vibração
    if (P.saturation || P.vibrance) {
      const y = luma(r, g, b);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx > 0 ? (mx - mn) / Math.max(mx, 1e-6) : 0;
      const k = (1 + P.saturation) * (1 + P.vibrance * (1 - sat));
      r = y + (r - y) * k; g = y + (g - y) * k; b = y + (b - y) * k;
    }
    // 10. intensidade do look
    const it = P.intensity;
    rgb[0] = clamp01(r0 + (r - r0) * it);
    rgb[1] = clamp01(g0 + (g - g0) * it);
    rgb[2] = clamp01(b0 + (b - b0) * it);
    return rgb;
  }

  /** Gera a LUT 3D (Float32, ordem R mais rápido, depois G, depois B — igual ao .cube). */
  CM.buildLUT = function (P, ctx, N) {
    N = N || 33;
    const pr = prepare(P), lut = new Float32Array(N * N * N * 3), c = [0, 0, 0], m = N - 1;
    let o = 0;
    for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
      c[0] = r / m; c[1] = g / m; c[2] = b / m;
      processPixel(c, P, pr, ctx);
      lut[o++] = c[0]; lut[o++] = c[1]; lut[o++] = c[2];
    }
    return { size: N, data: lut };
  };

  CM.sampleLUT = function (lut, N, r, g, b, out) {
    const m = N - 1;
    let x = clamp01(r) * m, y = clamp01(g) * m, z = clamp01(b) * m;
    const x0 = Math.min(m - 1, Math.floor(x)), y0 = Math.min(m - 1, Math.floor(y)), z0 = Math.min(m - 1, Math.floor(z));
    const fx = x - x0, fy = y - y0, fz = z - z0;
    const sY = N * 3, sZ = N * N * 3, i000 = (z0 * N * N + y0 * N + x0) * 3;
    for (let ch = 0; ch < 3; ch++) {
      const i = i000 + ch;
      const c00 = lut[i] + (lut[i + 3] - lut[i]) * fx;
      const c10 = lut[i + sY] + (lut[i + sY + 3] - lut[i + sY]) * fx;
      const c01 = lut[i + sZ] + (lut[i + sZ + 3] - lut[i + sZ]) * fx;
      const c11 = lut[i + sZ + sY] + (lut[i + sZ + sY + 3] - lut[i + sZ + sY]) * fx;
      const c0 = c00 + (c10 - c00) * fy, c1 = c01 + (c11 - c01) * fy;
      out[ch] = c0 + (c1 - c0) * fz;
    }
    return out;
  };

  /** Aplica uma LUT a pixels RGBA (Uint8ClampedArray). */
  CM.applyLUT = function (L, src, dst) {
    const N = L.size, lut = L.data, m = N - 1;
    const idx = new Int32Array(256), frac = new Float32Array(256);
    for (let v = 0; v < 256; v++) { const x = (v / 255) * m, i = Math.min(m - 1, Math.floor(x)); idx[v] = i; frac[v] = x - i; }
    const sY = N * 3, sZ = N * N * 3;
    for (let p = 0, n = src.length; p < n; p += 4) {
      const ri = src[p], gi = src[p + 1], bi = src[p + 2];
      const fx = frac[ri], fy = frac[gi], fz = frac[bi];
      const base = (idx[bi] * N * N + idx[gi] * N + idx[ri]) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const i = base + ch;
        const c00 = lut[i] + (lut[i + 3] - lut[i]) * fx;
        const c10 = lut[i + sY] + (lut[i + sY + 3] - lut[i + sY]) * fx;
        const c01 = lut[i + sZ] + (lut[i + sZ + 3] - lut[i + sZ]) * fx;
        const c11 = lut[i + sZ + sY] + (lut[i + sZ + sY + 3] - lut[i + sZ + sY]) * fx;
        const c0 = c00 + (c10 - c00) * fy, c1 = c01 + (c11 - c01) * fy;
        dst[p + ch] = (c0 + (c1 - c0) * fz) * 255 + 0.5;
      }
      dst[p + 3] = src[p + 3];
    }
  };

  // ---------- Clonar LUT (antes/depois do mesmo frame) ----------
  CM.buildCloneLUT = function (before, after, G) {
    G = G || 17;
    const m = G - 1, n3 = G * G * G;
    const sum = new Float64Array(n3 * 3), w = new Float64Array(n3);
    const a = before.data, b = after.data;
    for (let p = 0; p < a.length; p += 4) {
      const r = a[p] / 255, g = a[p + 1] / 255, bl = a[p + 2] / 255;
      const off = [(b[p] - a[p]) / 255, (b[p + 1] - a[p + 1]) / 255, (b[p + 2] - a[p + 2]) / 255];
      const x = r * m, y = g * m, z = bl * m;
      const x0 = Math.min(m - 1, Math.floor(x)), y0 = Math.min(m - 1, Math.floor(y)), z0 = Math.min(m - 1, Math.floor(z));
      const fx = x - x0, fy = y - y0, fz = z - z0;
      for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const wt = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        if (wt <= 0) continue;
        const ci = (z0 + dz) * G * G + (y0 + dy) * G + (x0 + dx);
        w[ci] += wt; sum[ci * 3] += wt * off[0]; sum[ci * 3 + 1] += wt * off[1]; sum[ci * 3 + 2] += wt * off[2];
      }
    }
    // Preenche células sem amostras com relaxação (Laplace), mantendo as conhecidas presas aos dados.
    const known = new Float64Array(n3 * 3), v = new Float64Array(n3 * 3), nv = new Float64Array(n3 * 3);
    let covered = 0;
    for (let i = 0; i < n3; i++) if (w[i] > 0) { covered++; for (let c = 0; c < 3; c++) known[i * 3 + c] = v[i * 3 + c] = sum[i * 3 + c] / w[i]; }
    const MU = 0.6;
    for (let it = 0; it < 300; it++) {
      for (let z = 0; z < G; z++) for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
        const i = z * G * G + y * G + x;
        let cnt = 0, s0 = 0, s1 = 0, s2 = 0;
        const add = (j) => { cnt++; s0 += v[j * 3]; s1 += v[j * 3 + 1]; s2 += v[j * 3 + 2]; };
        if (x > 0) add(i - 1); if (x < m) add(i + 1);
        if (y > 0) add(i - G); if (y < m) add(i + G);
        if (z > 0) add(i - G * G); if (z < m) add(i + G * G);
        const W = w[i];
        nv[i * 3] = (W * known[i * 3] + MU * s0 / cnt) / (W + MU);
        nv[i * 3 + 1] = (W * known[i * 3 + 1] + MU * s1 / cnt) / (W + MU);
        nv[i * 3 + 2] = (W * known[i * 3 + 2] + MU * s2 / cnt) / (W + MU);
      }
      v.set(nv);
    }
    const out = new Float32Array(n3 * 3);
    for (let z = 0; z < G; z++) for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const i = z * G * G + y * G + x;
      out[i * 3] = clamp01(x / m + v[i * 3]); out[i * 3 + 1] = clamp01(y / m + v[i * 3 + 1]); out[i * 3 + 2] = clamp01(z / m + v[i * 3 + 2]);
    }
    return { size: G, data: out, coverage: covered / n3 };
  };

  // ---------- .cube ----------
  CM.toCube = function (L, title) {
    const lines = [`TITLE "${String(title || 'Next Color').replace(/"/g, "'")}"`, '# Criado com Next Color', `LUT_3D_SIZE ${L.size}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
    const d = L.data;
    for (let i = 0; i < d.length; i += 3) lines.push(`${d[i].toFixed(6)} ${d[i + 1].toFixed(6)} ${d[i + 2].toFixed(6)}`);
    return lines.join('\n') + '\n';
  };

  CM.parseCube = function (text) {
    let size = 0, min = [0, 0, 0], max = [1, 1, 1], title = '';
    const vals = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line[0] === '#') continue;
      const parts = line.split(/\s+/);
      const key = parts[0].toUpperCase();
      if (key === 'TITLE') { title = line.slice(5).trim().replace(/^"|"$/g, ''); continue; }
      if (key === 'LUT_3D_SIZE') { size = parseInt(parts[1], 10); continue; }
      if (key === 'LUT_1D_SIZE') throw new Error('LUT 1D não é suportada. Use uma LUT 3D .cube.');
      if (key === 'DOMAIN_MIN') { min = parts.slice(1, 4).map(Number); continue; }
      if (key === 'DOMAIN_MAX') { max = parts.slice(1, 4).map(Number); continue; }
      if (/^[A-Z_]+$/.test(key)) continue;
      if (parts.length >= 3) vals.push(+parts[0], +parts[1], +parts[2]);
    }
    if (!size || size < 2 || size > 128) throw new Error('Arquivo .cube sem LUT_3D_SIZE válido.');
    if (vals.length !== size * size * size * 3) throw new Error(`Esperava ${size ** 3} linhas de cor e encontrei ${vals.length / 3}.`);
    const data = new Float32Array(vals.length);
    for (let i = 0; i < vals.length; i++) { const c = i % 3; data[i] = clamp01((vals[i] - min[c]) / (max[c] - min[c] || 1)); }
    return { size, data, title };
  };

  // ---------- Preset Lightroom (.xmp) ----------
  /* Um preset de revelação não carrega uma LUT 3D. Então aproximamos:
   *  - curvas RGB tiradas do eixo neutro da LUT (tom, contraste e tonalização nas sombras/realces ficam exatos nos cinzas);
   *  - saturação global e HSL por cor medidos comparando a LUT com essas curvas. */
  function curvePoints(L) {
    const xs = [0, 16, 32, 64, 96, 128, 160, 192, 224, 240, 255], out = [[], [], []], c = [0, 0, 0];
    for (const x of xs) {
      CM.sampleLUT(L.data, L.size, x / 255, x / 255, x / 255, c);
      for (let ch = 0; ch < 3; ch++) out[ch].push([x, Math.round(clamp01(c[ch]) * 255)]);
    }
    return out;
  }
  const interpPts = (pts, v) => {
    const x = v * 255;
    for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) { const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t) / 255; }
    return pts[pts.length - 1][1] / 255;
  };

  CM.lutToPresetSettings = function (L) {
    const curves = curvePoints(L);
    const approx = (c) => [interpPts(curves[0], c[0]), interpPts(curves[1], c[1]), interpPts(curves[2], c[2])];
    const chroma = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
    const ratios = [];
    for (let h = 0; h < 360; h += 30) {
      const c = CM.hsl2rgb(h, 0.5, 0.5, [0, 0, 0]);
      const o = CM.sampleLUT(L.data, L.size, c[0], c[1], c[2], [0, 0, 0]);
      ratios.push((chroma(o) + 1e-3) / (chroma(approx(c)) + 1e-3));
    }
    ratios.sort((a, b) => a - b);
    const global = (ratios[5] + ratios[6]) / 2;
    const clampI = (v) => Math.max(-100, Math.min(100, Math.round(v)));
    const hsl = { hue: [], sat: [], lum: [] };
    const h1 = [0, 0, 0], h2 = [0, 0, 0];
    CM.HSL_HUES.forEach((h) => {
      const c = CM.hsl2rgb(h, 0.6, 0.5, [0, 0, 0]);
      const o = CM.sampleLUT(L.data, L.size, c[0], c[1], c[2], [0, 0, 0]), a = approx(c);
      CM.rgb2hsl(o[0], o[1], o[2], h1); CM.rgb2hsl(a[0], a[1], a[2], h2);
      let dh = h1[0] - h2[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      if (h1[1] < 0.05 || h2[1] < 0.05) dh = 0;
      hsl.hue.push(clampI((dh / 30) * 100));
      hsl.sat.push(clampI((((chroma(o) + 1e-3) / (chroma(a) + 1e-3)) / global - 1) * 100));
      hsl.lum.push(clampI((h1[2] - h2[2]) * 200));
    });
    return { curves, saturation: clampI((global - 1) * 100), hsl };
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const uuid = () => Array.from({ length: 32 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');

  CM.toXMP = function (L, name) {
    const s = CM.lutToPresetSettings(L);
    const seq = (pts) => pts.map((p) => `       <rdf:li>${p[0]}, ${p[1]}</rdf:li>`).join('\n');
    const hslAttrs = CM.HSL_NAMES.map((n, i) =>
      `   crs:HueAdjustment${n}="${s.hsl.hue[i]}"\n   crs:SaturationAdjustment${n}="${s.hsl.sat[i]}"\n   crs:LuminanceAdjustment${n}="${s.hsl.lum[i]}"`).join('\n');
    const nm = esc(name || 'Next Color');
    return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:Cluster=""
   crs:UUID="${uuid()}"
   crs:SupportsAmount="False"
   crs:SupportsColor="True"
   crs:SupportsMonochrome="True"
   crs:SupportsHighDynamicRange="True"
   crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True"
   crs:SupportsOutputReferred="True"
   crs:CameraModelRestriction=""
   crs:Copyright=""
   crs:ContactInfo=""
   crs:Version="15.0"
   crs:ProcessVersion="11.0"
   crs:Saturation="${s.saturation}"
${hslAttrs}
   crs:ToneCurveName2012="Custom"
   crs:HasSettings="True">
   <crs:Name>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${nm}</rdf:li>
    </rdf:Alt>
   </crs:Name>
   <crs:Group>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Next Color</rdf:li>
    </rdf:Alt>
   </crs:Group>
   <crs:ToneCurvePV2012>
    <rdf:Seq>
       <rdf:li>0, 0</rdf:li>
       <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012>
   <crs:ToneCurvePV2012Red>
    <rdf:Seq>
${seq(s.curves[0])}
    </rdf:Seq>
   </crs:ToneCurvePV2012Red>
   <crs:ToneCurvePV2012Green>
    <rdf:Seq>
${seq(s.curves[1])}
    </rdf:Seq>
   </crs:ToneCurvePV2012Green>
   <crs:ToneCurvePV2012Blue>
    <rdf:Seq>
${seq(s.curves[2])}
    </rdf:Seq>
   </crs:ToneCurvePV2012Blue>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
  };

  /** Lê um preset .xmp (ou o XMP embutido num .dng) e converte para os parâmetros do app. */
  CM.parseXMP = function (text) {
    const start = text.indexOf('<x:xmpmeta'), end = text.indexOf('</x:xmpmeta>');
    if (start < 0 || end < 0) throw new Error('Não encontrei configurações de preset (XMP) neste arquivo.');
    const x = text.slice(start, end);
    const attr = (k) => {
      const m = x.match(new RegExp(`crs:${k}="([^"]*)"`)) || x.match(new RegExp(`<crs:${k}>([^<]*)</crs:${k}>`));
      return m ? parseFloat(m[1].replace('+', '')) : 0;
    };
    const seq = (k) => {
      const m = x.match(new RegExp(`<crs:${k}>([\\s\\S]*?)</crs:${k}>`));
      if (!m) return null;
      const pts = [...m[1].matchAll(/<rdf:li>\s*([\d.]+)\s*,\s*([\d.]+)\s*<\/rdf:li>/g)].map((p) => [+p[1] / 255, +p[2] / 255]);
      return pts.length >= 2 ? pts : null;
    };
    const P = CM.defaultParams();
    const nameM = x.match(/<crs:Name>[\s\S]*?<rdf:li[^>]*>([^<]*)<\/rdf:li>/);
    P.exposure = Math.max(-2, Math.min(2, attr('Exposure2012')));
    P.contrast = attr('Contrast2012') / 100 * 0.6;
    P.highlights = attr('Highlights2012') / 100 * 0.6;
    P.shadows = attr('Shadows2012') / 100 * 0.6;
    P.saturation = attr('Saturation') / 100;
    P.vibrance = attr('Vibrance') / 100;
    P.temp = attr('IncrementalTemperature') / 100;
    P.tint = attr('IncrementalTint') / 100;
    CM.HSL_NAMES.forEach((n, i) => {
      P.hslHue[i] = attr('HueAdjustment' + n) / 100;
      P.hslSat[i] = attr('SaturationAdjustment' + n) / 100;
      P.hslLum[i] = attr('LuminanceAdjustment' + n) / 100;
    });
    const shSat = attr('ColorGradeShadowSat') || attr('SplitToningShadowSaturation');
    const hiSat = attr('ColorGradeHighlightSat') || attr('SplitToningHighlightSaturation');
    P.shHue = attr('ColorGradeShadowHue') || attr('SplitToningShadowHue');
    P.hiHue = attr('ColorGradeHighlightHue') || attr('SplitToningHighlightHue');
    P.shAmt = shSat / 100; P.hiAmt = hiSat / 100;
    P.curves.m = seq('ToneCurvePV2012') || P.curves.m;
    P.curves.r = seq('ToneCurvePV2012Red') || P.curves.r;
    P.curves.g = seq('ToneCurvePV2012Green') || P.curves.g;
    P.curves.b = seq('ToneCurvePV2012Blue') || P.curves.b;
    return { params: P, name: nameM ? nameM[1] : '' };
  };

  global.CM = CM;
})(typeof window !== 'undefined' ? window : globalThis);
