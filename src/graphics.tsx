import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {body, colors} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** Anel tracejado girando com pontos orbitando. */
export const Orbit: React.FC<{size: number; x: number; y: number; delay?: number; color?: string; speed?: number}> = ({
  size,
  x,
  y,
  delay = 0,
  color = colors.ink,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 200}, durationInFrames: 40});
  const rot = frame * 0.6 * speed;
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: p}}>
      <svg width={size} height={size} style={{transform: `rotate(${rot}deg)`}}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={3}
          strokeDasharray="10 18" strokeDashoffset={c * (1 - p)} />
        <circle cx={size / 2} cy={6} r={9} fill={colors.accent} />
        <circle cx={size / 2} cy={size - 6} r={6} fill={colors.accent2} />
      </svg>
      <svg width={size} height={size} style={{position: 'absolute', inset: 0, transform: `rotate(${-rot * 1.6}deg) scale(0.72)`}}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={2}
          strokeDasharray={`${c * 0.25 * p} ${c}`} strokeLinecap="round" />
      </svg>
    </div>
  );
};

/** Sinais de "+" e pontos flutuando em parallax. */
export const FloatingMarks: React.FC<{count?: number; seed?: string}> = ({count = 14, seed = 'm'}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`${seed}x${i}`) * 1080;
        const y0 = random(`${seed}y${i}`) * 1920;
        const depth = 0.4 + random(`${seed}d${i}`) * 1.2;
        const y = ((y0 - frame * depth * 1.4) % 1920 + 1920) % 1920;
        const rot = frame * depth * 1.5;
        const isPlus = i % 3 !== 0;
        const fade = interpolate(frame, [0, 30], [0, 1], clamp);
        const s = 14 + depth * 14;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, opacity: (0.15 + depth * 0.25) * fade, transform: `rotate(${rot}deg)`}}>
            {isPlus ? (
              <svg width={s} height={s} viewBox="0 0 20 20">
                <path d="M10 2v16M2 10h16" stroke={i % 2 ? colors.accent2 : colors.ink} strokeWidth={2.5} strokeLinecap="round" />
              </svg>
            ) : (
              <div style={{width: s * 0.5, height: s * 0.5, borderRadius: 99, border: `2px solid ${colors.accent}`}} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Linha que se desenha (path SVG). */
export const DrawPath: React.FC<{d: string; delay?: number; duration?: number; color?: string; width?: number; length?: number; style?: React.CSSProperties; w?: number; h?: number}> = ({
  d, delay = 0, duration = 30, color = colors.accent2, width = 6, length = 2000, style, w = 1080, h = 1920,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, duration], [0, 1], {...clamp, easing: ease});
  return (
    <svg width={w} height={h} style={{position: 'absolute', overflow: 'visible', ...style}}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - p)} />
    </svg>
  );
};

/** Barras de áudio pulsando. */
export const Waveform: React.FC<{bars?: number; width?: number; height?: number; color?: string}> = ({
  bars = 28, width = 700, height = 120, color = colors.ink,
}) => {
  const frame = useCurrentFrame();
  const bw = width / bars;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: bw * 0.35, height, width}}>
      {new Array(bars).fill(0).map((_, i) => {
        const v = 0.2 + 0.8 * Math.abs(Math.sin(frame / 7 + i * 0.7) * Math.cos(frame / 11 + i * 0.3));
        return <div key={i} style={{width: bw * 0.65, height: height * v, borderRadius: 99, background: i % 5 === 0 ? colors.accent : color, opacity: 0.85}} />;
      })}
    </div>
  );
};

/** Diafragma de lente girando. */
export const Aperture: React.FC<{size: number; color?: string}> = ({size, color = colors.ink}) => {
  const frame = useCurrentFrame();
  const open = 0.5 + 0.5 * Math.sin(frame / 18);
  const blades = 6;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{transform: `rotate(${frame * 1.2}deg)`}}>
      <circle r={46} fill="none" stroke={color} strokeWidth={3} />
      {new Array(blades).fill(0).map((_, i) => {
        const a = (i / blades) * Math.PI * 2;
        const r1 = 12 + open * 14;
        return (
          <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a + 1.1) * 46} y2={Math.sin(a + 1.1) * 46}
            stroke={color} strokeWidth={3} strokeLinecap="round" />
        );
      })}
    </svg>
  );
};

/** Cronômetro com arco varrendo. */
export const Stopwatch: React.FC<{size: number; delay?: number}> = ({size, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 13}});
  const sweep = interpolate(frame - delay, [5, 80], [0, 1], {...clamp, easing: ease});
  const r = 42;
  const c = 2 * Math.PI * r;
  const hand = sweep * 360;
  return (
    <svg width={size} height={size} viewBox="-50 -58 100 108" style={{transform: `scale(${p})`, overflow: 'visible'}}>
      <rect x={-7} y={-58} width={14} height={8} rx={3} fill={colors.ink} />
      <circle r={r} fill="none" stroke="#ffffff22" strokeWidth={7} />
      <circle r={r} fill="none" stroke={colors.accent2} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - sweep)} transform="rotate(-90)" />
      <line x1={0} y1={0} x2={0} y2={-30} stroke={colors.accent} strokeWidth={4} strokeLinecap="round" transform={`rotate(${hand})`} />
      <circle r={5} fill={colors.ink} />
    </svg>
  );
};

/** Fita de filme rolando na diagonal. */
export const FilmStrip: React.FC<{y: number; angle?: number; speed?: number; opacity?: number}> = ({y, angle = -12, speed = 4, opacity = 0.25}) => {
  const frame = useCurrentFrame();
  const cell = 200;
  const offset = -((frame * speed) % cell);
  return (
    <div style={{position: 'absolute', left: -400, top: y, width: 2000, height: 170, transform: `rotate(${angle}deg)`, opacity, background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: offset, top: 0, display: 'flex'}}>
        {new Array(14).fill(0).map((_, i) => (
          <div key={i} style={{width: cell, height: 170, position: 'relative', flexShrink: 0}}>
            <div style={{position: 'absolute', top: 10, left: 20, right: 20, height: 14, background: `repeating-linear-gradient(90deg, ${colors.ink} 0 22px, transparent 22px 40px)`}} />
            <div style={{position: 'absolute', top: 36, bottom: 36, left: 12, right: 12, borderRadius: 6, background: i % 2 ? '#2a1a18' : '#1d1d22'}} />
            <div style={{position: 'absolute', bottom: 10, left: 20, right: 20, height: 14, background: `repeating-linear-gradient(90deg, ${colors.ink} 0 22px, transparent 22px 40px)`}} />
          </div>
        ))}
      </div>
    </div>
  );
};

/** Botão de play animado: anéis de onda, giro, "clique". */
export const PlayButton: React.FC<{size: number; delay?: number; pressAt?: number}> = ({size, delay = 0, pressAt = 55}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 11}});
  const press = frame >= pressAt ? spring({frame: frame - pressAt, fps, config: {damping: 8, stiffness: 300}}) : 0;
  const pressScale = frame >= pressAt ? interpolate(press, [0, 0.5, 1], [1, 0.86, 1]) : 1;
  const breathe = 1 + Math.sin(frame / 8) * 0.03;
  return (
    <div style={{position: 'relative', width: size, height: size, transform: `scale(${enter * pressScale * breathe})`}}>
      {[0, 1, 2].map((i) => {
        const t = ((frame - delay + i * 20) % 60) / 60;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, borderRadius: '50%', border: `4px solid ${colors.accent}`,
            transform: `scale(${1 + t * 0.9})`, opacity: (1 - t) * 0.6 * enter}} />
        );
      })}
      <svg width={size} height={size} style={{position: 'absolute', inset: 0, transform: `rotate(${frame * 2}deg)`}}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 5} fill="none" stroke={colors.ink} strokeWidth={6}
          strokeDasharray={`${size * 1.8} ${size * 0.6}`} strokeLinecap="round" />
      </svg>
      <div style={{position: 'absolute', inset: 22, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 ${60 + Math.sin(frame / 6) * 25}px ${colors.accent}aa`}}>
        <div style={{width: 0, height: 0, marginLeft: size * 0.07, borderTop: `${size * 0.16}px solid transparent`, borderBottom: `${size * 0.16}px solid transparent`,
          borderLeft: `${size * 0.26}px solid ${colors.ink}`}} />
      </div>
    </div>
  );
};

/** Botão de CTA: entrada elástica, brilho passando, pulso, seta, cursor tocando e ripple. */
export const CtaButton: React.FC<{label: React.ReactNode; delay?: number; tapAt?: number}> = ({label, delay = 0, tapAt = 75}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 10, mass: 0.8}});
  const shine = ((frame - delay) % 45) / 45;
  const pulse = 1 + Math.sin(frame / 7) * 0.02;
  const t = frame - tapAt;
  const cursorIn = interpolate(frame, [tapAt - 25, tapAt - 2], [0, 1], {...clamp, easing: ease});
  const pressed = t >= 0 && t < 8 ? interpolate(t, [0, 3, 8], [1, 0.92, 1]) : 1;
  const ripple = interpolate(t, [0, 25], [0, 1], clamp);
  const arrow = Math.sin(frame / 5) * 10;
  return (
    <div style={{position: 'relative', transform: `translateY(${(1 - enter) * 120}px) scale(${enter * pulse * pressed})`, opacity: Math.min(1, enter * 1.5)}}>
      {/* halo */}
      <div style={{position: 'absolute', inset: -14, borderRadius: 999, border: `3px solid ${colors.accent}`, opacity: 0.35 + Math.sin(frame / 7) * 0.25}} />
      <div style={{position: 'relative', overflow: 'hidden', padding: '34px 64px', borderRadius: 999, background: `linear-gradient(135deg, ${colors.accent}, #ff6a3d)`,
        boxShadow: `0 20px 60px ${colors.accent}66`, display: 'flex', alignItems: 'center', gap: 30}}>
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 46, color: colors.ink, lineHeight: 1.2, textAlign: 'center'}}>{label}</div>
        <svg width={54} height={54} viewBox="0 0 24 24" style={{transform: `translateX(${arrow}px)`}}>
          <path d="M4 12h14M13 6l6 6-6 6" stroke={colors.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* brilho passando */}
        <div style={{position: 'absolute', top: -40, bottom: -40, width: 120, left: `${-20 + shine * 140}%`, transform: 'skewX(-20deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)'}} />
        {/* ripple do toque */}
        {t >= 0 && (
          <div style={{position: 'absolute', left: '88%', top: '55%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 99,
            background: 'rgba(255,255,255,0.6)', transform: `scale(${ripple * 22})`, opacity: 1 - ripple}} />
        )}
      </div>
      {/* cursor/dedo */}
      <svg width={90} height={90} viewBox="0 0 24 24" style={{position: 'absolute', left: '86%', top: '50%',
        transform: `translate(${(1 - cursorIn) * 260}px, ${(1 - cursorIn) * 300}px) scale(${pressed})`, opacity: cursorIn,
        filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))'}}>
        <path d="M5 2l14 9-6 1.5 3.5 7-2.5 1.2-3.5-7L6 18z" fill={colors.ink} stroke={colors.bg} strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** Badge numérico com anel que se desenha. */
export const NumberBadge: React.FC<{n: number; delay: number; active: boolean}> = ({n, delay, active}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 20], [0, 1], {...clamp, easing: ease});
  const r = 40;
  const c = 2 * Math.PI * r;
  const glow = active ? 1 + Math.sin(frame / 4) * 0.06 : 1;
  return (
    <div style={{position: 'relative', width: 96, height: 96, flexShrink: 0, transform: `scale(${glow})`}}>
      <svg width={96} height={96} viewBox="-48 -48 96 96" style={{position: 'absolute', transform: `rotate(${-90 + frame * (active ? 3 : 0)}deg)`}}>
        <circle r={r} fill={active ? colors.accent : 'transparent'} fillOpacity={active ? 1 : 0} stroke={active ? colors.accent : colors.ink}
          strokeOpacity={active ? 1 : 0.5} strokeWidth={4} strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: body, fontWeight: 800,
        fontSize: 34, color: colors.ink, opacity: p}}>
        {String(n).padStart(2, '0')}
      </div>
    </div>
  );
};
