import React from 'react';
import {AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ease} from './graphics';
import {glow, neon} from './ReelNeon';
import {body, display} from './theme';

/**
 * Intro de apresentação — verde neon e preto (8 s).
 * Funciona em 16:9 (IntroNeon) e 9:16 (IntroNeonVertical): tudo escala por width/height.
 *
 * Tempos (frames a 30 fps) — o áudio em scripts/intro_som.py segue os mesmos:
 */
export const AT = {
  spark: 0, // faísca desenha a linha central
  open: 22, // linha abre, flash, grade aparece
  next: 34, // letras de NEXT acendem uma a uma
  creators: 66, // CREATORS entra com impacto
  tagline: 92, // subtítulo digitado
  sweep: 104, // feixe de luz passa no logo
  outro: 204, // zoom + flash de saída
};
export const INTRO_DURATION = 240;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const useScale = () => {
  const {width, height} = useVideoConfig();
  return {width, height, s: Math.min(width, height) / 1080, wide: width > height};
};

/** Chão quadriculado com perspectiva que sobe do escuro. */
const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useScale();
  const p = interpolate(frame, [AT.open, AT.open + 30], [0, 1], {...clamp, easing: ease});
  const horizon = height * 0.62;
  const off = (frame * 3) % 120;
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: p}}>
      <div style={{position: 'absolute', left: -width, right: -width, top: horizon, height: height * 1.2, transformOrigin: 'top',
        transform: `perspective(500px) rotateX(${interpolate(p, [0, 1], [85, 64])}deg)`,
        backgroundImage: `linear-gradient(${neon.green}66 2px, transparent 2px), linear-gradient(90deg, ${neon.green}55 2px, transparent 2px)`,
        backgroundSize: '120px 120px', backgroundPosition: `0 ${off}px`,
        maskImage: 'linear-gradient(to bottom, transparent, black 30%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: horizon - 180, height: 200,
        background: `radial-gradient(ellipse at 50% 100%, ${neon.green}30, transparent 70%)`}} />
    </AbsoluteFill>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, s} = useScale();
  const fade = interpolate(frame, [AT.open, AT.open + 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: fade}}>
      {new Array(50).fill(0).map((_, i) => {
        const depth = 0.3 + random(`d${i}`) * 1.4;
        const x = random(`x${i}`) * width + Math.sin(frame / 25 + i) * 10;
        const y = ((((random(`y${i}`) * (height + 100)) - frame * depth * 1.6) % (height + 100)) + height + 100) % (height + 100) - 50;
        const sz = (2 + depth * 4) * s;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: sz, height: sz, borderRadius: 99, background: neon.green,
          boxShadow: glow(neon.green, 0.4), opacity: 0.15 + depth * 0.35}} />;
      })}
    </AbsoluteFill>
  );
};

/** Faísca que corre desenhando uma linha e depois a linha se abre em duas (cima/baixo). */
const SparkLine: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, s} = useScale();
  const draw = interpolate(frame, [AT.spark, AT.open], [0, 1], {...clamp, easing: ease});
  const open = interpolate(frame, [AT.open, AT.open + 26], [0, 1], {...clamp, easing: ease});
  const fadeOut = interpolate(frame, [AT.open + 20, AT.open + 46], [1, 0], clamp);
  const gap = open * height * 0.36;
  const lineW = width * draw;
  const line = (dy: number) => (
    <div style={{position: 'absolute', left: (width - lineW) / 2, top: height / 2 + dy - 3 * s, width: lineW, height: 6 * s, borderRadius: 99,
      background: neon.green, boxShadow: glow(neon.green, 1.5 * s), opacity: fadeOut}} />
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {line(-gap)}
      {open > 0 && line(gap)}
      {draw < 1 && (
        <>
          {[-1, 1].map((d) => (
            <div key={d} style={{position: 'absolute', left: width / 2 + (d * lineW) / 2 - 20 * s, top: height / 2 - 20 * s, width: 40 * s, height: 40 * s,
              borderRadius: 99, background: '#fff', boxShadow: `0 0 ${30 * s}px ${neon.green}, 0 0 ${80 * s}px ${neon.green}`}} />
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};

/** Flash branco-esverdeado curto. */
const Flash: React.FC<{at: number; strength?: number; len?: number}> = ({at, strength = 0.8, len = 12}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - at, [0, 2, len], [0, strength, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{background: `radial-gradient(circle, #ffffff, ${neon.green} 40%, transparent 80%)`, opacity: o}} /> : null;
};

/** Onda de choque circular no impacto. */
const Shockwave: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const {width, height, s} = useScale();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {[0, 6].map((d) => {
        const p = interpolate(frame - at - d, [0, 34], [0, 1], {...clamp, easing: ease});
        if (p <= 0 || p >= 1) return null;
        const r = p * Math.max(width, height) * 0.7;
        return <div key={d} style={{position: 'absolute', left: width / 2 - r, top: height / 2 - r, width: r * 2, height: r * 2, borderRadius: '50%',
          border: `${(1 - p) * 10 * s}px solid ${neon.green}`, boxShadow: glow(neon.green, (1 - p) * s), opacity: 1 - p}} />;
      })}
    </AbsoluteFill>
  );
};

/** Letra que acende como tubo de neon (pisca antes de firmar). */
const NeonLetter: React.FC<{ch: string; at: number}> = ({ch, at}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  const on = local < 0 ? interpolate(local, [-12, 0], [0, 0.08], clamp) : local < 9 ? (random(`n${ch}${at}${frame}`) > 0.45 ? 1 : 0.15) : 1;
  return <span style={{opacity: on, display: 'inline-block'}}>{ch}</span>;
};

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {s, wide} = useScale();
  const size = (wide ? 230 : 250) * s;
  const slam = spring({frame: frame - AT.creators, fps, config: {damping: 11, mass: 0.8}});
  const shake = frame >= AT.creators && frame < AT.creators + 10 ? (random(`sh${frame}`) - 0.5) * 24 * s * (1 - (frame - AT.creators) / 10) : 0;
  const sweep = interpolate(frame, [AT.sweep, AT.sweep + 26], [-0.3, 1.3], {...clamp, easing: ease});
  const breathe = 1 + Math.sin(frame / 18) * 0.008;
  return (
    <div style={{position: 'relative', textAlign: 'center', fontFamily: display, lineHeight: 0.95, transform: `translateX(${shake}px) scale(${breathe})`}}>
      <div style={{fontSize: size, color: 'transparent', WebkitTextStroke: `${4 * s}px ${neon.green}`, letterSpacing: 12 * s,
        filter: `drop-shadow(0 0 ${10 * s}px ${neon.green}) drop-shadow(0 0 ${36 * s}px ${neon.green})`}}>
        {'NEXT'.split('').map((c, i) => <NeonLetter key={i} ch={c} at={AT.next + i * 6} />)}
      </div>
      <div style={{fontSize: size, color: neon.green, textShadow: glow(neon.green, 1.3 * s), opacity: slam,
        transform: `scale(${interpolate(slam, [0, 1], [2.4, 1])})`, filter: slam < 0.9 ? `blur(${(1 - slam) * 20}px)` : undefined}}>CREATORS</div>
      {/* feixe de luz passando por cima do logo */}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'screen', pointerEvents: 'none'}}>
        <div style={{position: 'absolute', top: '-30%', bottom: '-30%', width: '18%', left: `${sweep * 100}%`, transform: 'skewX(-20deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)', filter: `blur(${8 * s}px)`}} />
      </div>
    </div>
  );
};

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const {s, wide} = useScale();
  const text = 'AUDIOVISUAL PARA EMPRESAS';
  const n = Math.floor(interpolate(frame - AT.tagline, [0, 26], [0, text.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0 && n < text.length + 1;
  const bar = interpolate(frame, [AT.tagline - 6, AT.tagline + 14], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 * s, opacity: frame >= AT.tagline - 6 ? 1 : 0}}>
      <div style={{width: 420 * s * bar, height: 6 * s, borderRadius: 99, background: neon.green, boxShadow: glow(neon.green, s)}} />
      <div style={{fontFamily: body, fontWeight: 800, fontSize: (wide ? 44 : 38) * s, letterSpacing: (wide ? 12 : 6) * s, color: neon.soft, textShadow: glow(neon.green, 0.4 * s),
        minHeight: 56 * s}}>
        {text.slice(0, n)}<span style={{opacity: caret ? 1 : 0, color: neon.green}}>▍</span>
      </div>
    </div>
  );
};

/** HUD de câmera nos cantos + selo "APRESENTAÇÃO". */
const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const {s} = useScale();
  const p = interpolate(frame, [AT.open + 4, AT.open + 30], [0, 1], {...clamp, easing: ease});
  const m = 50 * s;
  const L = 90 * s * p;
  const w = 5 * s;
  const corner = (st: React.CSSProperties) => (
    <div style={{position: 'absolute', width: L, height: L, borderColor: neon.green, borderStyle: 'solid', borderWidth: 0,
      filter: `drop-shadow(0 0 ${8 * s}px ${neon.green})`, ...st}} />
  );
  const blink = Math.floor(frame / 15) % 2 === 0;
  const txt: React.CSSProperties = {fontFamily: body, fontWeight: 800, fontSize: 26 * s, letterSpacing: 4 * s, color: neon.green,
    textShadow: glow(neon.green, 0.4 * s), opacity: p, position: 'absolute'};
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.85}}>
      {corner({left: m, top: m, borderLeftWidth: w, borderTopWidth: w})}
      {corner({right: m, top: m, borderRightWidth: w, borderTopWidth: w})}
      {corner({left: m, bottom: m, borderLeftWidth: w, borderBottomWidth: w})}
      {corner({right: m, bottom: m, borderRightWidth: w, borderBottomWidth: w})}
      <div style={{...txt, top: m + 30 * s, left: m + 40 * s, display: 'flex', alignItems: 'center', gap: 12 * s}}>
        <div style={{width: 18 * s, height: 18 * s, borderRadius: 99, background: neon.green, opacity: blink ? 1 : 0.15}} /> REC
      </div>
      <div style={{...txt, top: m + 30 * s, right: m + 40 * s, fontVariantNumeric: 'tabular-nums'}}>
        00:00:{String(Math.floor(frame / 30)).padStart(2, '0')}:{String(frame % 30).padStart(2, '0')}
      </div>
      <div style={{...txt, bottom: m + 30 * s, left: 0, right: 0, textAlign: 'center', letterSpacing: 10 * s, fontSize: 24 * s, color: `${neon.green}cc`}}>
        APRESENTAÇÃO INSTITUCIONAL
      </div>
    </AbsoluteFill>
  );
};

const Crt: React.FC = () => {
  const frame = useCurrentFrame();
  const {height} = useScale();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 5px)', opacity: 0.92 + random(`f${frame}`) * 0.08}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, height: 200, top: ((frame * 9) % (height + 400)) - 200,
        background: `linear-gradient(transparent, ${neon.green}0d, transparent)`}} />
    </AbsoluteFill>
  );
};

export const IntroNeon: React.FC = () => {
  const frame = useCurrentFrame();
  const {s, wide} = useScale();
  // saída: zoom rápido para dentro do logo + escurece
  const out = interpolate(frame, [AT.outro, INTRO_DURATION - 6], [0, 1], {...clamp, easing: (t) => t * t * t});
  const end = interpolate(frame, [INTRO_DURATION - 12, INTRO_DURATION], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: neon.bg}}>
      <Audio src={staticFile('audio/intro-neon.wav')} />
      <AbsoluteFill style={{opacity: end, transform: `scale(${1 + out * 5})`, filter: out > 0.05 ? `blur(${out * 12}px)` : undefined}}>
        <Grid />
        <Particles />
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 50 * s,
          transform: `translateY(${(wide ? -40 : -120) * s}px)`}}>
          <Logo />
          <Tagline />
        </AbsoluteFill>
        <Shockwave at={AT.creators} />
        <SparkLine />
        <Hud />
      </AbsoluteFill>
      <Flash at={AT.open} strength={0.55} />
      <Flash at={AT.creators} strength={0.7} len={14} />
      <Flash at={INTRO_DURATION - 14} strength={0.9} len={14} />
      <Crt />
    </AbsoluteFill>
  );
};
