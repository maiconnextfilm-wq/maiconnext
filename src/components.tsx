import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {body, colors, display} from './theme';

/** Grão de filme + vinheta para dar textura cinematográfica. */
export const FilmTexture: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)',
        }}
      />
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.09, mixBlendMode: 'screen'}}>
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Interface de câmera: cantos do visor, REC piscando e timecode. */
export const Viewfinder: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = Math.floor(frame / fps);
  const f = frame % fps;
  const tc = `00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  const blink = Math.floor(frame / 15) % 2 === 0;
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: 'absolute',
        width: 90,
        height: 90,
        borderTop: `5px solid ${colors.ink}`,
        borderLeft: `5px solid ${colors.ink}`,
        opacity: 0.8,
        transform: `rotate(${rot}deg)`,
        ...pos,
      }}
    />
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {corner({top: 70, left: 60}, 0)}
      {corner({top: 70, right: 60}, 90)}
      {corner({bottom: 70, right: 60}, 180)}
      {corner({bottom: 70, left: 60}, 270)}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 110,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: body,
          fontWeight: 800,
          fontSize: 34,
          color: colors.ink,
          letterSpacing: 2,
        }}
      >
        <div style={{width: 26, height: 26, borderRadius: 13, background: colors.accent, opacity: blink ? 1 : 0.15}} />
        REC
      </div>
      <div
        style={{
          position: 'absolute',
          top: 100,
          right: 110,
          fontFamily: body,
          fontWeight: 600,
          fontSize: 32,
          color: colors.ink,
          opacity: 0.85,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {tc}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 105,
          left: 110,
          fontFamily: body,
          fontWeight: 600,
          fontSize: 26,
          color: colors.muted,
          letterSpacing: 3,
        }}
      >
        4K · 24FPS · ISO 800
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 105,
          right: 110,
          fontFamily: body,
          fontWeight: 800,
          fontSize: 26,
          color: colors.ink,
          letterSpacing: 3,
        }}
      >
        NEXT CREATORS
      </div>
    </AbsoluteFill>
  );
};

/** Palavras entrando uma a uma (estilo kinetic typography de Reels). */
export const KineticLine: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  highlight?: string[];
  stagger?: number;
}> = ({text, delay = 0, size = 150, color = colors.ink, highlight = [], stagger = 4}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `0 ${size * 0.22}px`,
        fontFamily: display,
        fontSize: size,
        lineHeight: 1.02,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      {words.map((w, i) => {
        const p = spring({frame: frame - delay - i * stagger, fps, config: {damping: 14, mass: 0.6}});
        const isHl = highlight.includes(w.replace(/[.,!?]/g, ''));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: isHl ? colors.bg : color,
              background: isHl ? colors.accent2 : 'transparent',
              padding: isHl ? '0 18px' : 0,
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px) scale(${interpolate(p, [0, 1], [1.3, 1])})`,
              filter: `blur(${interpolate(p, [0, 1], [12, 0])}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Flash branco curto nos cortes. */
export const Flash: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - at, [0, 2, 8], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: colors.ink, opacity: o, pointerEvents: 'none'}} />;
};

/** Leve tremida de câmera na mão. */
export const useHandheld = (amount = 6) => {
  const frame = useCurrentFrame();
  const t = frame / 10;
  const x = (random(`x${Math.floor(t)}`) - 0.5) * amount;
  const y = (random(`y${Math.floor(t)}`) - 0.5) * amount;
  const x2 = (random(`x${Math.floor(t) + 1}`) - 0.5) * amount;
  const y2 = (random(`y${Math.floor(t) + 1}`) - 0.5) * amount;
  const k = t - Math.floor(t);
  return `translate(${x + (x2 - x) * k}px, ${y + (y2 - y) * k}px)`;
};
