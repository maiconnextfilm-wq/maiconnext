/* 16 looks prontos: só parâmetros, aplicados sobre a sua imagem. Índices HSL:
 * 0 vermelho, 1 laranja, 2 amarelo, 3 verde, 4 aqua, 5 azul, 6 roxo, 7 magenta. */
(function (global) {
  const hsl = (arr) => { const h = [0, 0, 0, 0, 0, 0, 0, 0], s = h.slice(), l = h.slice(); (arr || []).forEach(([i, a, b, c]) => { h[i] = a; s[i] = b; l[i] = c; }); return { hslHue: h, hslSat: s, hslLum: l }; };
  global.LOOKS = [
    { name: 'Teal & Orange', p: { contrast: 0.25, saturation: 0.05, shHue: 195, shAmt: 0.6, hiHue: 32, hiAmt: 0.5, ...hsl([[1, 0, 0.15, 0.05], [4, 0.15, 0.2, 0], [5, -0.1, 0.1, 0]]) } },
    { name: 'Filme quente', p: { temp: 0.35, fade: 0.35, contrast: 0.12, saturation: -0.1, hiHue: 40, hiAmt: 0.3 } },
    { name: 'Frio nórdico', p: { temp: -0.35, saturation: -0.25, contrast: 0.15, shHue: 210, shAmt: 0.3, highlights: -0.15 } },
    { name: 'Pastel suave', p: { contrast: -0.3, fade: 0.4, saturation: -0.15, vibrance: 0.2, highlights: -0.2, exposure: 0.15 } },
    { name: 'Noir P&B', p: { saturation: -1, contrast: 0.45, shadows: -0.1, curves: { m: [[0, 0], [0.25, 0.18], [0.75, 0.84], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] } } },
    { name: 'Verão dourado', p: { temp: 0.45, vibrance: 0.3, hiHue: 45, hiAmt: 0.35, exposure: 0.1, ...hsl([[2, -0.1, 0.2, 0.05]]) } },
    { name: 'Verde moody', p: { contrast: 0.2, saturation: -0.1, fade: 0.2, shHue: 160, shAmt: 0.35, ...hsl([[3, -0.3, -0.4, -0.3], [2, -0.2, -0.2, 0]]) } },
    { name: 'Retrô 70', p: { temp: 0.3, tint: 0.15, fade: 0.5, saturation: -0.2, shHue: 30, shAmt: 0.25, hiHue: 50, hiAmt: 0.25 } },
    { name: 'Neon noite', p: { tint: 0.25, contrast: 0.3, vibrance: 0.4, shHue: 260, shAmt: 0.5, hiHue: 320, hiAmt: 0.3 } },
    { name: 'Matte', p: { fade: 0.6, contrast: -0.15, saturation: -0.3 } },
    { name: 'Bleach bypass', p: { saturation: -0.55, contrast: 0.5, highlights: -0.1 } },
    { name: 'Pele dourada', p: { temp: 0.25, highlights: -0.2, shadows: 0.2, ...hsl([[1, 0, 0.1, 0.15], [0, 0.1, -0.1, 0]]) } },
    { name: 'Azul oceano', p: { temp: -0.15, contrast: 0.15, ...hsl([[5, -0.1, 0.3, -0.1], [4, 0, 0.3, 0]]) } },
    { name: 'Outono', p: { temp: 0.25, ...hsl([[3, -0.6, -0.2, 0], [1, 0, 0.3, 0], [2, -0.2, 0.1, 0]]) } },
    { name: 'Cyberpunk', p: { tint: 0.3, contrast: 0.3, saturation: 0.2, shHue: 190, shAmt: 0.5, hiHue: 300, hiAmt: 0.4 } },
    { name: 'Analógico', p: { fade: 0.3, contrast: 0.15, saturation: -0.05, shHue: 180, shAmt: 0.2, hiHue: 45, hiAmt: 0.25, curves: { m: [[0, 0.04], [0.3, 0.27], [0.7, 0.75], [1, 0.96]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] } } },
  ];
})(window);
