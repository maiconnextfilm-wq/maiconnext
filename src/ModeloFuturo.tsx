import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FilmTexture} from './components';
import {body, colors, display} from './theme';

/**
 * Modelo de reel "realista + IA + futurista" para o @nextmaicon.
 * Clipes gerados no Higgsfield (public/modelo/c0..c4.mp4, 5 s cada) + texto e card final aqui.
 */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CLIP = 135; // 4,5 s de cada clipe (corta a cauda)

const SHOTS: {src: string; kicker: string; line: string}[] = [
  {src: 'modelo/c0.mp4', kicker: '', line: 'NADA DISSO\nFOI FILMADO'},
  {src: 'modelo/c1.mp4', kicker: 'CIDADE · DRONE · NOITE', line: 'SEM VOO'},
  {src: 'modelo/c2.mp4', kicker: 'PRODUTO · ESTÚDIO · LASER', line: 'SEM ESTÚDIO'},
  {src: 'modelo/c3.mp4', kicker: 'SHOW · PLATEIA · GRUA', line: 'SEM EQUIPE'},
  {src: 'modelo/c4.mp4', kicker: 'DIREÇÃO + IA', line: 'SÓ IDEIA\nE DIREÇÃO'},
];

const END = 90;
export const MODELO_DURATION = SHOTS.length * CLIP + END;

const Caption: React.FC<{kicker: string; line: string}> = ({kicker, line}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 6, fps, config: {damping: 200}});
  const out = interpolate(frame, [CLIP - 10, CLIP], [1, 0], clamp);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 380, opacity: out}}>
      {kicker ? (
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 30, letterSpacing: 8, color: colors.accent, marginBottom: 18,
          opacity: s, transform: `translateY(${(1 - s) * 20}px)`}}>
          {kicker}
        </div>
      ) : null}
      <div style={{fontFamily: display, fontSize: 132, lineHeight: 1.08, color: colors.ink, textAlign: 'center', whiteSpace: 'pre-line', paddingTop: 30,
        textShadow: '0 6px 40px rgba(0,0,0,0.85)', clipPath: `inset(0 0 ${(1 - s) * 100}% 0)`, transform: `translateY(${(1 - s) * 40}px)`}}>
        {line}
      </div>
    </AbsoluteFill>
  );
};

const Shot: React.FC<{src: string; kicker: string; line: string}> = (p) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, CLIP], [1.04, 1.12]);
  const flash = interpolate(frame, [0, 5], [0.7, 0], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <OffthreadVideo src={staticFile(p.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.75) 100%)'}} />
      <Caption kicker={p.kicker} line={p.line} />
      <AbsoluteFill style={{backgroundColor: colors.accent, opacity: flash, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame, fps, config: {damping: 200}});
  const b = spring({frame: frame - 12, fps, config: {damping: 200}});
  const bar = interpolate(frame, [4, 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontFamily: display, fontSize: 150, color: colors.ink, lineHeight: 0.9, textAlign: 'center', opacity: a, transform: `scale(${0.9 + a * 0.1})`}}>
        NEXT<br />FILM
      </div>
      <div style={{width: 420 * bar, height: 10, backgroundColor: colors.accent, margin: '40px 0'}} />
      <div style={{fontFamily: body, fontSize: 40, fontWeight: 600, color: colors.ink, textAlign: 'center', lineHeight: 1.35, opacity: b}}>
        Filmes com IA para marcas e artistas
      </div>
      <div style={{fontFamily: body, fontSize: 34, fontWeight: 700, color: colors.accent, marginTop: 30, letterSpacing: 4, opacity: b}}>
        @THENEXTFILM
      </div>
    </AbsoluteFill>
  );
};

export const ModeloFuturo: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {SHOTS.map((s, i) => (
      <Sequence key={s.src} from={i * CLIP} durationInFrames={CLIP}>
        <Shot {...s} />
      </Sequence>
    ))}
    <Sequence from={SHOTS.length * CLIP} durationInFrames={END}>
      <EndCard />
    </Sequence>
    <FilmTexture />
  </AbsoluteFill>
);
