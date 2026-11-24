import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {body} from './theme';

/**
 * Intro premium — "assinatura" da Next Creators (10 s).
 * Verde e preto, mas sofisticado: linhas finíssimas, instrumento de outro mundo
 * (anéis graduados, glifos, esfera de pontos), partículas em espiral, grão de filme,
 * reflexo anamórfico e tipografia fina e espaçada.
 * Funciona em 16:9 (IntroPremium) e 9:16 (IntroPremiumVertical).
 * O som (scripts/intro_premium_som.py) segue os mesmos tempos:
 */
export const AT = {
  swarm: 10, // partículas começam a espiralar para o centro
  sphere: 36, // esfera de pontos se forma
  rings: 48, // anéis graduados se desenham
  annot: 60, // microtipografia nos cantos
  glyphs: 84, // anel de glifos acende
  logo: 150, // linha de luz + NEXT
  creators: 172, // CREATORS
  tagline: 205, // subtítulo
  sweep: 222, // reflexo passando no logo
  outro: 266, // saída
};
export const INTRO_PREMIUM_DURATION = 300;

const P = {
  bg: '#010302',
  deep: '#04170c',
  emerald: '#0f6b3a',
  green: '#39FF14',
  mint: '#BDF7CF',
  plat: '#EEF6F1',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const out3 = Easing.out(Easing.cubic);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const prog = (f: number, a: number, d: number, e = inOut) => interpolate(f, [a, a + d], [0, 1], {...clamp, easing: e});

const useStage = () => {
  const {width, height} = useVideoConfig();
  return {width, height, cx: width / 2, cy: height / 2, s: Math.min(width, height) / 1080, wide: width > height};
};

/* ---------------- atmosfera ---------------- */

const Nebula: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, s} = useStage();
  const blobs = [
    {x: 0.3, y: 0.35, r: 700, c: P.emerald, o: 0.22},
    {x: 0.72, y: 0.62, r: 800, c: '#0a3d22', o: 0.35},
    {x: 0.5, y: 0.5, r: 520, c: '#1a8f4c', o: 0.12},
  ];
  return (
    <AbsoluteFill style={{opacity: prog(frame, 0, 60)}}>
      {blobs.map((b, i) => {
        const x = b.x * width + Math.sin(frame / 90 + i * 2) * 60 * s;
        const y = b.y * height + Math.cos(frame / 110 + i) * 40 * s;
        const r = b.r * s;
        return <div key={i} style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%',
          background: `radial-gradient(circle, ${b.c} 0%, transparent 65%)`, opacity: b.o, filter: `blur(${40 * s}px)`}} />;
      })}
    </AbsoluteFill>
  );
};

const Stars: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, cx, cy, s} = useStage();
  const push = 1 + frame * 0.0009;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {new Array(240).fill(0).map((_, i) => {
        const x0 = (random(`sx${i}`) - 0.5) * width * 1.2;
        const y0 = (random(`sy${i}`) - 0.5) * height * 1.2;
        const d = 0.3 + random(`sd${i}`) * 0.7;
        const k = 1 + (push - 1) * d * 3;
        const tw = 0.5 + 0.5 * Math.sin(frame / (8 + d * 10) + i);
        return <circle key={i} cx={cx + x0 * k} cy={cy + y0 * k} r={(0.5 + d * 1.1) * s} fill={i % 7 === 0 ? P.mint : P.plat}
          opacity={(0.08 + d * 0.4) * tw * prog(frame, 0, 40)} />;
      })}
    </svg>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.22}}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 85%, #000 100%)'}} />
);

/* ---------------- partículas em espiral ---------------- */

const Swarm: React.FC<{ringR: number}> = ({ringR}) => {
  const frame = useCurrentFrame();
  const {width, height, cx, cy, s} = useStage();
  const far = Math.max(width, height) * 0.62;
  const pos = (i: number, f: number) => {
    const a0 = random(`a${i}`) * Math.PI * 2;
    const r0 = far * (0.85 + random(`r${i}`) * 0.7);
    const delay = AT.swarm + random(`dl${i}`) * 55;
    const p = interpolate(f, [delay, delay + 75], [0, 1], {...clamp, easing: out3});
    const dir = i % 2 ? 1 : -1;
    const ang = a0 + (1 - p) * Math.PI * 2.4 * dir + f * 0.0035 * dir;
    const target = ringR * (0.9 + random(`t${i}`) * 0.25);
    const r = r0 + (target - r0) * p;
    const tilt = 0.42 + random(`tl${i}`) * 0.1; // achatado, como um disco em perspectiva
    return {x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * tilt, p, started: f >= delay};
  };
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {new Array(280).fill(0).map((_, i) => {
        const a = pos(i, frame);
        if (!a.started) return null;
        const b = pos(i, frame - 1.2);
        const o = interpolate(a.p, [0, 0.1, 1], [0, 0.9, 0.35]);
        const c = i % 5 === 0 ? P.green : P.mint;
        return (
          <g key={i} opacity={o}>
            <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke={c} strokeWidth={0.8 * s} strokeLinecap="round" opacity={0.6} />
            <circle cx={a.x} cy={a.y} r={(i % 5 === 0 ? 1.8 : 1.1) * s} fill={c} />
          </g>
        );
      })}
    </svg>
  );
};

/* ---------------- esfera de pontos ---------------- */

const SPHERE_N = 720;
const sphere = new Array(SPHERE_N).fill(0).map((_, i) => {
  const y = 1 - (i / (SPHERE_N - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const th = i * Math.PI * (3 - Math.sqrt(5));
  return {x: Math.cos(th) * r, y, z: Math.sin(th) * r};
});

const Sphere: React.FC<{R: number}> = ({R}) => {
  const frame = useCurrentFrame();
  const {width, height, cx, cy, s} = useStage();
  const a = frame * 0.009;
  const b = 0.38;
  const breathe = 1 + Math.sin(frame / 40) * 0.01;
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {sphere.map((p, i) => {
        const appear = prog(frame, AT.sphere + (i / SPHERE_N) * 50, 18, out3);
        if (appear <= 0) return null;
        const x1 = p.x * Math.cos(a) + p.z * Math.sin(a);
        const z1 = -p.x * Math.sin(a) + p.z * Math.cos(a);
        const y2 = p.y * Math.cos(b) - z1 * Math.sin(b);
        const z2 = p.y * Math.sin(b) + z1 * Math.cos(b);
        const f = 1 / (1 - z2 * 0.28);
        const d = (z2 + 1) / 2;
        const rr = R * breathe * (0.6 + 0.4 * appear);
        return <circle key={i} cx={cx + x1 * rr * f} cy={cy + y2 * rr * f} r={(0.6 + d * 1.5) * s}
          fill={d > 0.82 && i % 9 === 0 ? P.green : P.mint} opacity={(0.06 + d * 0.8) * appear} />;
      })}
    </svg>
  );
};

/* ---------------- instrumento: anéis, glifos, órbitas ---------------- */

/** Glifo procedural (traços numa grade 3×4) — parece uma escrita desconhecida. */
const glyphPath = (k: number, w: number, h: number) => {
  const pts: [number, number][] = [];
  for (let j = 0; j < 5; j++) {
    pts.push([Math.floor(random(`gx${k}${j}`) * 3) / 2, Math.floor(random(`gy${k}${j}`) * 4) / 3]);
  }
  let d = '';
  for (let j = 0; j < 4; j++) {
    if (random(`gs${k}${j}`) < 0.25) continue;
    const [x1, y1] = pts[j];
    const [x2, y2] = pts[j + 1];
    d += `M${(x1 - 0.5) * w} ${(y1 - 0.5) * h}L${(x2 - 0.5) * w} ${(y2 - 0.5) * h}`;
  }
  if (random(`gc${k}`) < 0.35) d += `M${-w * 0.1} ${-h * 0.5}a${w * 0.1} ${w * 0.1} 0 1 0 0.1 0`;
  return d || `M0 ${-h / 2}L0 ${h / 2}`;
};

const Instrument: React.FC<{base: number}> = ({base}) => {
  const frame = useCurrentFrame();
  const {width, height, cx, cy, s, wide} = useStage();
  const R = base;
  const tickP = prog(frame, AT.rings, 55);
  const ringP = prog(frame, AT.rings + 10, 50);
  const rot = frame * 0.06;
  const TICKS = 240;
  const GLYPHS = 44;
  const crossP = prog(frame, AT.rings - 10, 50, out3);
  const label = (txt: string, ang: number, r: number, at: number) => {
    const p = prog(frame, at, 20);
    const n = Math.floor(txt.length * p);
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    return (
      <g opacity={p}>
        <line x1={cx + Math.cos(ang) * (R * 1.1)} y1={cy + Math.sin(ang) * (R * 1.1)} x2={x} y2={y} stroke={P.mint} strokeWidth={0.7 * s} opacity={0.5} />
        <circle cx={x} cy={y} r={2.2 * s} fill={P.green} />
        <text x={x + (Math.cos(ang) >= 0 ? 12 : -12) * s} y={y + 4 * s} fill={P.mint} fontFamily={body} fontWeight={500} fontSize={13 * s}
          letterSpacing={3 * s} textAnchor={Math.cos(ang) >= 0 ? 'start' : 'end'} opacity={0.75}>{txt.slice(0, n)}</text>
      </g>
    );
  };
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      {/* cruz de mira com respiro no centro */}
      <g stroke={P.mint} strokeWidth={0.6 * s} opacity={0.35}>
        <line x1={cx - R * 1.6 * crossP} y1={cy} x2={cx - R * 0.15} y2={cy} />
        <line x1={cx + R * 0.15} y1={cy} x2={cx + R * 1.6 * crossP} y2={cy} />
        <line x1={cx} y1={cy - R * 1.35 * crossP} x2={cx} y2={cy - R * 0.15} />
        <line x1={cx} y1={cy + R * 0.15} x2={cx} y2={cy + R * 1.35 * crossP} />
      </g>

      {/* anel graduado: 240 marcações que se desenham em sentido horário */}
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        {new Array(TICKS).fill(0).map((_, i) => {
          if (i / TICKS > tickP) return null;
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
          const major = i % 20 === 0;
          const mid = i % 5 === 0;
          const l = (major ? 22 : mid ? 12 : 6) * s;
          return <line key={i} x1={cx + Math.cos(a) * R} y1={cy + Math.sin(a) * R} x2={cx + Math.cos(a) * (R - l)} y2={cy + Math.sin(a) * (R - l)}
            stroke={major ? P.green : P.mint} strokeWidth={(major ? 1.4 : 0.7) * s} opacity={major ? 0.95 : 0.5} />;
        })}
      </g>

      {/* anéis finos girando em sentidos opostos */}
      {[
        {r: R * 1.1, dash: `${1 * s} ${7 * s}`, sp: -0.12, o: 0.55, w: 1},
        {r: R * 0.82, dash: `${60 * s} ${14 * s} ${4 * s} ${14 * s}`, sp: 0.18, o: 0.35, w: 0.8},
        {r: R * 1.22, dash: `${R * 0.9} ${R * 0.5}`, sp: 0.05, o: 0.25, w: 0.6},
      ].map((g, i) => {
        const C = 2 * Math.PI * g.r;
        return (
          <circle key={i} cx={cx} cy={cy} r={g.r} fill="none" stroke={P.mint} strokeWidth={g.w * s} strokeDasharray={g.dash}
            opacity={g.o * ringP} transform={`rotate(${frame * g.sp * 3 - 90} ${cx} ${cy})`}
            style={{clipPath: undefined}} strokeDashoffset={C * (1 - ringP)} />
        );
      })}

      {/* órbitas inclinadas (elipses) com um ponto correndo */}
      {[0, 60, 120].map((tilt, i) => {
        const p = prog(frame, AT.rings + 20 + i * 8, 40);
        const rx = R * 0.98;
        const ry = R * 0.3;
        const t = frame * 0.02 * (i % 2 ? -1 : 1) + i * 2;
        const px = Math.cos(t) * rx;
        const py = Math.sin(t) * ry;
        const rad = ((tilt + frame * 0.05) * Math.PI) / 180;
        return (
          <g key={tilt} opacity={p * 0.6}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={P.mint} strokeWidth={0.6 * s} opacity={0.5}
              transform={`rotate(${tilt + frame * 0.05} ${cx} ${cy})`} />
            <circle cx={cx + px * Math.cos(rad) - py * Math.sin(rad)} cy={cy + px * Math.sin(rad) + py * Math.cos(rad)} r={3 * s} fill={P.green}
              style={{filter: `drop-shadow(0 0 ${6 * s}px ${P.green})`}} />
          </g>
        );
      })}

      {/* anel de glifos */}
      <g transform={`rotate(${-frame * 0.04} ${cx} ${cy})`}>
        {new Array(GLYPHS).fill(0).map((_, k) => {
          const at = AT.glyphs + k * 1.4;
          const local = frame - at;
          if (local < 0) return null;
          const on = local < 8 ? (random(`fl${k}${frame}`) > 0.5 ? 1 : 0.2) : 1;
          const a = (k / GLYPHS) * 360;
          const rr = R * 0.92;
          return (
            <g key={k} transform={`rotate(${a} ${cx} ${cy}) translate(${cx} ${cy - rr})`} opacity={0.6 * on}>
              <path d={glyphPath(k, 9 * s, 14 * s)} stroke={k % 11 === 0 ? P.green : P.mint} strokeWidth={1.1 * s} fill="none" strokeLinecap="round" />
            </g>
          );
        })}
      </g>

      {/* rótulos técnicos saindo do instrumento */}
      {label('NC—001', -Math.PI * (wide ? 0.82 : 0.66), R * 1.45, AT.annot + 20)}
      {label('Φ 1.618', -Math.PI * (wide ? 0.18 : 0.34), R * 1.45, AT.annot + 30)}
      {label('ÓRBITA 03', Math.PI * (wide ? 0.2 : 0.34), R * 1.45, AT.annot + 40)}
      {label('ΔT 00:10', Math.PI * (wide ? 0.8 : 0.66), R * 1.45, AT.annot + 50)}
    </svg>
  );
};

/* ---------------- logo ---------------- */

const LightLine: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, cx, cy, s} = useStage();
  const p = prog(frame, AT.logo - 8, 26, out3);
  const fade = interpolate(frame, [AT.logo + 10, AT.logo + 50], [1, 0], clamp);
  const flare = interpolate(frame - AT.logo, [-4, 2, 40], [0, 1, 0], clamp);
  const w = width * 0.75 * p;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <div style={{position: 'absolute', left: cx - w / 2, top: cy - 0.75 * s, width: w, height: 1.5 * s, opacity: fade,
        background: `linear-gradient(90deg, transparent, ${P.mint}, #fff, ${P.mint}, transparent)`}} />
      {/* reflexo anamórfico */}
      <div style={{position: 'absolute', left: cx - width * 0.6, top: cy - 18 * s, width: width * 1.2, height: 36 * s, opacity: flare * 0.8,
        background: `radial-gradient(ellipse at center, #ffffff 0%, ${P.green}aa 18%, transparent 60%)`, filter: `blur(${6 * s}px)`}} />
      <div style={{position: 'absolute', left: cx - 160 * s, top: cy - 160 * s, width: 320 * s, height: 320 * s, borderRadius: '50%', opacity: flare,
        background: `radial-gradient(circle, #ffffff 0%, ${P.green}66 25%, transparent 65%)`}} />
    </AbsoluteFill>
  );
};

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const {s, wide} = useStage();
  const size = (wide ? 190 : 200) * s;
  const word = 'NEXT';
  const spacing = interpolate(frame, [AT.logo, AT.logo + 70], [1.1, 0.34], {...clamp, easing: out3});
  const shimmer = interpolate(frame, [AT.logo, INTRO_PREMIUM_DURATION], [0, 100]);
  const cP = prog(frame, AT.creators, 30, out3);
  const rule = prog(frame, AT.creators + 6, 30, out3);
  const sweep = interpolate(frame, [AT.sweep, AT.sweep + 40], [-0.3, 1.6], {...clamp, easing: inOut});
  return (
    <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 * s}}>
      <div style={{position: 'relative', display: 'flex', fontFamily: body, fontWeight: 200, fontSize: size, lineHeight: 1,
        letterSpacing: `${spacing}em`, marginRight: `-${spacing}em`,
        filter: `drop-shadow(0 0 ${18 * s}px ${P.green}40)`}}>
        {word.split('').map((ch, i) => {
          const p = prog(frame, AT.logo + 4 + i * 5, 34, out3);
          return (
            <span key={i} style={{display: 'inline-block', opacity: p, filter: `blur(${(1 - p) * 22 * s}px)`, transform: `translateY(${(1 - p) * 14 * s}px)`,
              backgroundImage: `linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.95) 50%, transparent 58%), linear-gradient(100deg, #4f9e6b 0%, ${P.mint} 30%, #ffffff 46%, ${P.plat} 50%, ${P.mint} 62%, #2f8a52 100%)`,
              backgroundSize: '400% 100%, 300% 100%', backgroundPosition: `${(1 - (sweep * 1.3 - i * 0.28)) * 100}% 0, ${shimmer}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 28 * s, opacity: cP}}>
        <div style={{width: 120 * s * rule, height: 1, background: `linear-gradient(90deg, transparent, ${P.mint})`}} />
        <div style={{fontFamily: body, fontWeight: 500, fontSize: 34 * s, letterSpacing: `${interpolate(cP, [0, 1], [1.6, 0.9])}em`,
          marginRight: '-0.9em', color: P.mint, filter: `blur(${(1 - cP) * 8 * s}px)`}}>CREATORS</div>
        <div style={{width: 120 * s * rule, height: 1, background: `linear-gradient(90deg, ${P.mint}, transparent)`}} />
      </div>
    </div>
  );
};

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const {s, wide} = useStage();
  const text = 'AUDIOVISUAL PARA EMPRESAS';
  return (
    <div style={{display: 'flex', fontFamily: body, fontWeight: 400, fontSize: (wide ? 20 : 22) * s, letterSpacing: `${wide ? 0.62 : 0.42}em`,
      color: `${P.plat}cc`}}>
      {text.split('').map((c, i) => {
        const p = prog(frame, AT.tagline + i * 0.9, 16, out3);
        return <span key={i} style={{opacity: p, filter: `blur(${(1 - p) * 6}px)`, whiteSpace: 'pre'}}>{c}</span>;
      })}
    </div>
  );
};

/* ---------------- microtipografia de moldura ---------------- */

const Typed: React.FC<{text: string; at: number; style?: React.CSSProperties}> = ({text, at, style}) => {
  const frame = useCurrentFrame();
  const n = Math.floor(interpolate(frame - at, [0, text.length * 0.8], [0, text.length], clamp));
  return <div style={style}>{text.slice(0, n)}</div>;
};

const Frame: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, s} = useStage();
  const m = 56 * s;
  const p = prog(frame, AT.annot - 20, 40);
  const t: React.CSSProperties = {fontFamily: body, fontWeight: 500, fontSize: 12.5 * s, letterSpacing: 3.2 * s, color: P.mint, opacity: 0.7,
    lineHeight: 1.9, fontVariantNumeric: 'tabular-nums'};
  const plus = (x: number, y: number) => (
    <g key={`${x}${y}`} stroke={P.mint} strokeWidth={0.8 * s} opacity={0.6 * p}>
      <line x1={x - 7 * s} y1={y} x2={x + 7 * s} y2={y} />
      <line x1={x} y1={y - 7 * s} x2={x} y2={y + 7 * s} />
    </g>
  );
  const tc = `${String(Math.floor(frame / 30)).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {/* moldura fina que se desenha */}
        <rect x={m} y={m} width={width - m * 2} height={height - m * 2} fill="none" stroke={P.mint} strokeWidth={0.5 * s} opacity={0.18}
          strokeDasharray={(width + height) * 2} strokeDashoffset={(width + height) * 2 * (1 - p)} />
        {plus(m, m)}
        {plus(width - m, m)}
        {plus(m, height - m)}
        {plus(width - m, height - m)}
        {/* régua inferior */}
        {new Array(61).fill(0).map((_, i) => {
          const x = width / 2 + (i - 30) * 9 * s;
          const l = (i % 10 === 0 ? 10 : 4) * s;
          return <line key={i} x1={x} x2={x} y1={height - m - 26 * s} y2={height - m - 26 * s - l} stroke={P.mint} strokeWidth={0.6 * s}
            opacity={0.45 * prog(frame, AT.annot + Math.abs(i - 30) * 0.6, 12)} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: m + 24 * s, top: m + 22 * s, ...t}}>
        <Typed text="NEXT CREATORS — SEQ. 001" at={AT.annot} />
        <Typed text="ASSINATURA VISUAL" at={AT.annot + 14} style={{opacity: 0.55}} />
      </div>
      <div style={{position: 'absolute', right: m + 24 * s, top: m + 22 * s, ...t, textAlign: 'right'}}>
        <div style={{opacity: p}}>TC {tc}</div>
        <Typed text={`${width}×${height} · 30 FPS`} at={AT.annot + 10} style={{opacity: 0.55}} />
      </div>
      <div style={{position: 'absolute', left: m + 24 * s, bottom: m + 22 * s, ...t}}>
        <Typed text="FILMES · CONTEÚDO · EVENTOS" at={AT.annot + 24} />
      </div>
      <div style={{position: 'absolute', right: m + 24 * s, bottom: m + 22 * s, display: 'flex', alignItems: 'flex-end', gap: 3 * s, height: 22 * s,
        opacity: p * 0.75}}>
        {new Array(18).fill(0).map((_, i) => (
          <div key={i} style={{width: 2 * s, background: i % 6 === 0 ? P.green : P.mint,
            height: (4 + Math.abs(Math.sin(frame / 7 + i * 0.7) * Math.cos(frame / 13 + i)) * 18) * s}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- composição ---------------- */

export const IntroPremium: React.FC = () => {
  const frame = useCurrentFrame();
  const {s, wide} = useStage();
  const base = (wide ? 330 : 400) * s;
  const cam = 1 + interpolate(frame, [0, INTRO_PREMIUM_DURATION], [0, 0.07]);
  const roll = interpolate(frame, [0, INTRO_PREMIUM_DURATION], [0.6, -0.6]);
  // depois que o logo entra, o instrumento recua para segundo plano
  const dim = interpolate(frame, [AT.logo - 4, AT.logo + 30], [1, 0.3], clamp);
  const sphereDim = interpolate(frame, [AT.logo - 4, AT.logo + 30], [1, 0.16], clamp);
  const outro = prog(frame, AT.outro, INTRO_PREMIUM_DURATION - AT.outro, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{background: P.bg}}>
      <Audio src={staticFile('audio/intro-premium.wav')} />
      <AbsoluteFill style={{opacity: 1 - outro}}>
        <Nebula />
        <AbsoluteFill style={{transform: `scale(${cam + outro * 0.15}) rotate(${roll}deg)`}}>
          <Stars />
          <AbsoluteFill style={{opacity: sphereDim}}><Sphere R={base * 0.62} /></AbsoluteFill>
          <AbsoluteFill style={{opacity: dim}}>
            <Instrument base={base} />
            <Swarm ringR={base * 1.02} />
          </AbsoluteFill>
        </AbsoluteFill>
        <LightLine />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 44 * s,
          transform: `translateY(${18 * s}px) scale(${1 + outro * 0.04})`}}>
          <Logo />
          <Tagline />
        </AbsoluteFill>
        <Frame />
      </AbsoluteFill>
      <Vignette />
      <Grain />
    </AbsoluteFill>
  );
};
