import React from 'react';
import {AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FilmTexture} from './components';
import {body, colors, display} from './theme';

/**
 * Modelo de EPISÓDIO DE SÉRIE para o @nextmaicon (perfil pessoal).
 * Estrutura fixa: gancho frio → abertura da série → cenas narradas → cliffhanger "continua no EP seguinte".
 * Para um novo episódio, troque só o objeto EP (textos + clipes). Clipes em public/ (aqui: placeholders reaproveitados).
 */

type Scene = {src: string; dur: number; text: string; hl?: string; from?: number};

export const EP = {
  serie: 'MAICON 2030',
  numero: '01',
  titulo: 'O dia em que a IA\npegou meu trabalho',
  gancho: {src: 'modelo/c4.mp4', dur: 75, text: 'Era pra ser só mais um job.', hl: 'só mais um'},
  cenas: [
    {src: 'modelo/c0.mp4', dur: 100, text: 'Câmera na mão desde moleque. Sempre foi o meu jeito de ver o mundo.', hl: 'desde moleque'},
    {src: 'modelo/c1.mp4', dur: 95, text: 'Até que um cliente me mandou um vídeo…', hl: 'um vídeo'},
    {src: 'modelo/c2.mp4', dur: 95, text: 'feito inteiro por inteligência artificial.', hl: 'inteligência artificial'},
    {src: 'modelo/c2.mp4', dur: 80, from: 70, text: 'Sem estúdio. Sem equipe. Sem mim.', hl: 'Sem mim.'},
    {src: 'modelo/c3.mp4', dur: 100, text: 'Naquela noite, no meio de um show, eu decidi uma coisa:', hl: 'eu decidi'},
    {src: 'modelo/c4.mp4', dur: 100, from: 40, text: 'se a IA vai filmar… ela vai filmar comigo.', hl: 'comigo.'},
  ] as Scene[],
  freeze: 'modelo/c4_freeze.jpg', // último quadro congelado no cliffhanger
  proximo: 'EP. 02 — O primeiro filme\nque eu fiz sem câmera',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const OPEN = 75; // abertura da série
const CLIFF = 120;

const total = (s: Scene[]) => s.reduce((a, c) => a + c.dur, 0);
export const EPISODIO_DURATION = EP.gancho.dur + OPEN + total(EP.cenas) + CLIFF;

/** Barras de cinema (2.35:1 dentro do 9:16 fica exagerado; usamos faixas finas) + selo da série. */
const SeriesChrome: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: '#000'}} />
    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: '#000'}} />
    <div style={{position: 'absolute', top: 150, left: 60, display: 'flex', alignItems: 'center', gap: 14}}>
      <div style={{width: 14, height: 14, borderRadius: 7, background: colors.accent}} />
      <div style={{fontFamily: body, fontWeight: 800, fontSize: 26, letterSpacing: 6, color: colors.ink}}>
        {EP.serie} · EP {EP.numero}
      </div>
    </div>
  </AbsoluteFill>
);

/** Legenda de narração: palavra por palavra, com destaque em vermelho. */
const Narracao: React.FC<{text: string; hl?: string; dur: number}> = ({text, hl, dur}) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  // destaca só as palavras que caem dentro do trecho `hl`
  const hlStart = hl ? text.indexOf(hl) : -1;
  let pos = 0;
  const isHlAt = words.map((w) => {
    const start = pos;
    pos += w.length + 1;
    return hlStart >= 0 && start >= hlStart && start < hlStart + (hl as string).length;
  });
  const shown = interpolate(frame, [4, Math.min(dur * 0.6, 4 + words.length * 4)], [0, words.length], clamp);
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', padding: '0 70px 300px', opacity: out}}>
      <div style={{fontFamily: body, fontWeight: 800, fontSize: 62, lineHeight: 1.2, textAlign: 'center', color: colors.ink,
        textShadow: '0 4px 24px rgba(0,0,0,0.9)'}}>
        {words.map((w, i) => {
          const v = Math.max(0, Math.min(1, shown - i));
          const isHl = isHlAt[i];
          return (
            <span key={i} style={{opacity: v, display: 'inline-block', transform: `translateY(${(1 - v) * 14}px)`, marginRight: 16,
              color: isHl ? colors.accent : colors.ink}}>
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Cena: React.FC<Scene & {zoomIn?: boolean}> = ({src, dur, text, hl, from = 0, zoomIn = true}) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, dur], zoomIn ? [1.05, 1.13] : [1.13, 1.05]);
  const fade = interpolate(frame, [0, 6], [0, 1], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: fade}}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <OffthreadVideo src={staticFile(src)} startFrom={from} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.8))'}} />
      <Narracao text={text} hl={hl} dur={dur} />
    </AbsoluteFill>
  );
};

const Abertura: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame, fps, config: {damping: 200}});
  const b = spring({frame: frame - 14, fps, config: {damping: 200}});
  const bar = interpolate(frame, [0, 22], [0, 1], clamp);
  const flicker = frame < 8 ? (frame % 2 ? 0.4 : 1) : 1;
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', opacity: flicker}}>
      <div style={{fontFamily: body, fontWeight: 700, fontSize: 30, letterSpacing: 10, color: colors.accent, opacity: a}}>
        EPISÓDIO {EP.numero}
      </div>
      <div style={{fontFamily: display, fontSize: 170, color: colors.ink, lineHeight: 1.05, marginTop: 10, transform: `scale(${0.94 + a * 0.06})`, opacity: a}}>
        {EP.serie}
      </div>
      <div style={{width: 520 * bar, height: 10, background: colors.accent, margin: '26px 0 36px'}} />
      <div style={{fontFamily: body, fontWeight: 600, fontSize: 48, lineHeight: 1.25, color: colors.ink, textAlign: 'center', whiteSpace: 'pre-line',
        opacity: b, transform: `translateY(${(1 - b) * 20}px)`}}>
        {EP.titulo}
      </div>
    </AbsoluteFill>
  );
};

const Cliffhanger: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const stamp = spring({frame: frame - 10, fps, config: {damping: 12, mass: 0.6}});
  const next = spring({frame: frame - 40, fps, config: {damping: 200}});
  const dim = interpolate(frame, [0, 20], [0, 0.72], clamp);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* congela o último plano em P&B */}
      <AbsoluteFill style={{transform: 'scale(1.13)', filter: 'grayscale(1) contrast(1.3)'}}>
        <Img src={staticFile(EP.freeze)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: dim}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{fontFamily: display, fontSize: 150, color: colors.accent, border: `8px solid ${colors.accent}`, padding: '6px 40px 0',
          transform: `rotate(-6deg) scale(${2 - stamp})`, opacity: Math.min(1, stamp * 1.5)}}>
          CONTINUA
        </div>
        <div style={{fontFamily: body, fontWeight: 700, fontSize: 46, lineHeight: 1.3, color: colors.ink, textAlign: 'center', whiteSpace: 'pre-line',
          marginTop: 90, opacity: next, transform: `translateY(${(1 - next) * 20}px)`}}>
          {EP.proximo}
        </div>
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 32, letterSpacing: 4, color: colors.accent, marginTop: 40, opacity: next}}>
          SEGUE @NEXTMAICON PRA NÃO PERDER
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SerieEpisodio: React.FC = () => {
  let at = 0;
  const seq = (dur: number) => {
    const from = at;
    at += dur;
    return {from, durationInFrames: dur};
  };
  const g = seq(EP.gancho.dur);
  const o = seq(OPEN);
  const cenas = EP.cenas.map((c) => ({c, s: seq(c.dur)}));
  const f = seq(CLIFF);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence {...g}><Cena {...EP.gancho} /></Sequence>
      <Sequence {...o}><Abertura /></Sequence>
      {cenas.map(({c, s}, i) => (
        <Sequence key={i} {...s}><Cena {...c} zoomIn={i % 2 === 0} /></Sequence>
      ))}
      <Sequence {...f}><Cliffhanger /></Sequence>
      <SeriesChrome />
      <FilmTexture />
    </AbsoluteFill>
  );
};
