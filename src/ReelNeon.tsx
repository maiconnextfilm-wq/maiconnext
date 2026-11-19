import React from 'react';
import {AbsoluteFill, Audio, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ease} from './graphics';
import {body, display} from './theme';

/** Paleta: verde neon sobre preto. */
export const neon = {
  bg: '#030503',
  green: '#39FF14',
  soft: '#B6FF9E',
  dim: '#1B5E12',
  ink: '#EFFFEA',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const glow = (c = neon.green, k = 1) => `0 0 ${8 * k}px ${c}, 0 0 ${22 * k}px ${c}, 0 0 ${60 * k}px ${c}88`;

/** Sobreposição entre cenas em frames. */
const T = 14;

const SCENES = [
  {id: 'hook', dur: 110},
  {id: 'decide', dur: 125},
  {id: 'linguagem', dur: 115},
  {id: 'servicos', dur: 230},
  {id: 'historia', dur: 140},
  {id: 'cta', dur: 190},
] as const;

const timeline = (() => {
  let at = 0;
  return SCENES.map((s, i) => {
    const from = i === 0 ? 0 : at - T;
    at = from + s.dur;
    return {...s, from};
  });
})();
export const REEL_NEON_DURATION = timeline[timeline.length - 1].from + timeline[timeline.length - 1].dur;

/* ---------- Fundo ---------- */

/** Chão em grade com perspectiva rolando, horizonte brilhante. */
const NeonGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const off = (frame * 4) % 120;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -1200, right: -1200, top: 1180, height: 1400, transformOrigin: 'top',
        transform: 'perspective(500px) rotateX(62deg)',
        backgroundImage: `linear-gradient(${neon.green}66 2px, transparent 2px), linear-gradient(90deg, ${neon.green}55 2px, transparent 2px)`,
        backgroundSize: '120px 120px', backgroundPosition: `0 ${off}px`,
        maskImage: 'linear-gradient(to bottom, transparent, black 25%, black)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 25%, black)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1170, height: 6, background: neon.green, boxShadow: glow(neon.green, 2), opacity: 0.7}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, height: 300, background: `radial-gradient(ellipse at 50% 100%, ${neon.green}33, transparent 70%)`}} />
    </AbsoluteFill>
  );
};

/** Poeira/partículas verdes subindo. */
const Particles: React.FC<{count?: number}> = ({count = 40}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const depth = 0.3 + random(`d${i}`) * 1.4;
        const x = random(`x${i}`) * 1080 + Math.sin(frame / 30 + i) * 12;
        const y = (((random(`y${i}`) * 2100 - frame * depth * 2) % 2100) + 2100) % 2100 - 90;
        const s = 2 + depth * 4;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: 99, background: neon.green,
          boxShadow: glow(neon.green, 0.4), opacity: 0.2 + depth * 0.35}} />;
      })}
    </AbsoluteFill>
  );
};

/** Scanlines + vinheta + leve flicker de monitor. */
const CrtOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const flick = 0.92 + random(`f${frame}`) * 0.08;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 5px)', opacity: flick}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, height: 220, top: ((frame * 9) % 2300) - 220,
        background: `linear-gradient(transparent, ${neon.green}10, transparent)`}} />
    </AbsoluteFill>
  );
};

/** Cantoneiras de visor (HUD). */
const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 25], [0, 1], {...clamp, easing: ease});
  const corner = (style: React.CSSProperties) => (
    <div style={{position: 'absolute', width: 90 * p, height: 90 * p, borderColor: neon.green, borderStyle: 'solid', borderWidth: 0,
      filter: `drop-shadow(0 0 8px ${neon.green})`, ...style}} />
  );
  const blink = Math.floor(frame / 15) % 2 === 0;
  const secs = Math.floor(frame / 30);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.85}}>
      {corner({left: 60, top: 60, borderLeftWidth: 5, borderTopWidth: 5})}
      {corner({right: 60, top: 60, borderRightWidth: 5, borderTopWidth: 5})}
      {corner({left: 60, bottom: 60, borderLeftWidth: 5, borderBottomWidth: 5})}
      {corner({right: 60, bottom: 60, borderRightWidth: 5, borderBottomWidth: 5})}
      <div style={{position: 'absolute', top: 92, left: 100, display: 'flex', alignItems: 'center', gap: 14, fontFamily: body, fontWeight: 800,
        fontSize: 30, letterSpacing: 4, color: neon.green, textShadow: glow(neon.green, 0.5), opacity: p}}>
        <div style={{width: 20, height: 20, borderRadius: 99, background: neon.green, opacity: blink ? 1 : 0.15, boxShadow: glow()}} /> REC
      </div>
      <div style={{position: 'absolute', top: 92, right: 100, fontFamily: body, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: neon.green,
        textShadow: glow(neon.green, 0.5), opacity: p, fontVariantNumeric: 'tabular-nums'}}>
        00:{String(secs).padStart(2, '0')}:{String(frame % 30).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Texto ---------- */

/** Entrada/saída da cena: glitch rápido + desfoque. */
const SceneShell: React.FC<{dur: number; first?: boolean; last?: boolean; children: React.ReactNode}> = ({dur, first, last, children}) => {
  const frame = useCurrentFrame();
  const inP = first ? 1 : interpolate(frame, [0, T], [0, 1], {...clamp, easing: ease});
  const outP = last ? 0 : interpolate(frame, [dur - T, dur], [0, 1], {...clamp, easing: ease});
  const opacity = inP * (1 - outP);
  const jitter = (1 - inP) + outP > 0.05 ? (random(`j${frame}`) - 0.5) * 60 * ((1 - inP) + outP) : 0;
  return (
    <AbsoluteFill style={{opacity, transform: `translateX(${jitter}px) scale(${interpolate(inP, [0, 1], [1.08, 1]) * interpolate(outP, [0, 1], [1, 0.94])})`,
      filter: (1 - inP) + outP > 0.02 ? `blur(${((1 - inP) + outP) * 14}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

/** Palavra com glitch RGB-verde: duas cópias deslocadas que piscam ao entrar. */
const GlitchWord: React.FC<{children: string; at: number; size: number; color: string; outline?: boolean}> = ({children, at, size, color, outline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - at;
  const p = spring({frame: local, fps, config: {damping: 14, mass: 0.6}});
  const glitching = local >= 0 && local < 12;
  const dx = glitching ? (random(`gx${children}${frame}`) - 0.5) * 30 : 0;
  // liga/desliga tipo neon acendendo
  const on = local < 0 ? 0 : local < 10 ? (random(`on${children}${frame}`) > 0.4 ? 1 : 0.2) : 1;
  const style: React.CSSProperties = outline
    ? {color: 'transparent', WebkitTextStroke: `3px ${color}`, filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 24px ${color})`}
    : {color, textShadow: glow(color, 0.8)};
  return (
    <span style={{position: 'relative', display: 'inline-block', opacity: on * p, transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px)`,
      fontSize: size}}>
      {glitching && (
        <>
          <span style={{position: 'absolute', left: dx, top: 0, color: neon.soft, opacity: 0.7, clipPath: 'inset(0 0 55% 0)'}}>{children}</span>
          <span style={{position: 'absolute', left: -dx, top: 0, color: neon.dim, opacity: 0.9, clipPath: 'inset(50% 0 0 0)'}}>{children}</span>
        </>
      )}
      <span style={style}>{children}</span>
    </span>
  );
};

const Line: React.FC<{text: string; at: number; size?: number; color?: string; outline?: string[]; accent?: string[]; stagger?: number}> = ({
  text, at, size = 150, color = neon.ink, outline = [], accent = [], stagger = 4,
}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${size * 0.22}px`, fontFamily: display, lineHeight: 1.05,
    textTransform: 'uppercase', textAlign: 'center', padding: '0 70px'}}>
    {text.split(' ').map((w, i) => {
      const k = w.replace(/[.,!?]/g, '');
      return (
        <GlitchWord key={i} at={at + i * stagger} size={size} color={accent.includes(k) || outline.includes(k) ? neon.green : color}
          outline={outline.includes(k)}>{w}</GlitchWord>
      );
    })}
  </div>
);

const Sub: React.FC<{text: string; at: number}> = ({text, at}) => {
  const frame = useCurrentFrame();
  const n = Math.floor(interpolate(frame - at, [0, text.length * 1.4], [0, text.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{fontFamily: body, fontWeight: 600, fontSize: 52, color: neon.soft, letterSpacing: 1, textAlign: 'center', minHeight: 70,
      opacity: frame >= at ? 1 : 0}}>
      {'> '}{text.slice(0, n)}<span style={{opacity: caret ? 1 : 0, color: neon.green}}>▍</span>
    </div>
  );
};

/** Traço de neon que se desenha. */
const NeonBar: React.FC<{at: number; width?: number}> = ({at, width = 520}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, 20], [0, 1], {...clamp, easing: ease});
  return <div style={{width: width * p, height: 10, borderRadius: 99, background: neon.green, boxShadow: glow(neon.green, 1.2)}} />;
};

const Stack: React.FC<{children: React.ReactNode; gap?: number; y?: number}> = ({children, gap = 40, y = -120}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap, transform: `translateY(${y}px)`}}>{children}</AbsoluteFill>
);

/* ---------- Cenas ---------- */

const Hook: React.FC = () => (
  <Stack gap={10}>
    <Line text="Sua empresa é vista" size={165} accent={['vista']} at={6} />
    <Line text="ou só existe?" size={165} outline={['existe']} at={34} />
  </Stack>
);

/** Contador regressivo 3…2…1 num anel de neon. */
const Decide: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [8, 80], [0, 1], {...clamp});
  const n = Math.max(1, 3 - Math.floor(p * 3));
  const pop = spring({frame: frame - 8 - Math.floor(p * 3) * 24, fps, config: {damping: 10}});
  const R = 230;
  const C = 2 * Math.PI * R;
  return (
    <Stack gap={60} y={-80}>
      <div style={{position: 'relative', width: 520, height: 520}}>
        <svg width={520} height={520} style={{position: 'absolute', inset: 0, transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 14px ${neon.green})`}}>
          <circle cx={260} cy={260} r={R} fill="none" stroke={neon.dim} strokeWidth={10} />
          <circle cx={260} cy={260} r={R} fill="none" stroke={neon.green} strokeWidth={12} strokeLinecap="round" strokeDasharray={C}
            strokeDashoffset={C * p} />
        </svg>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: display, fontSize: 300, color: neon.green,
          textShadow: glow(neon.green, 1.4), transform: `scale(${interpolate(pop, [0, 1], [1.5, 1])})`}}>{n}s</AbsoluteFill>
      </div>
      <Line text="Seu cliente decide em segundos" size={110} accent={['segundos']} at={14} stagger={3} />
      <Sub text="E ele decide pelo que vê." at={55} />
    </Stack>
  );
};

/** Onda de áudio/espectro em barras neon. */
const Spectrum: React.FC<{y: number}> = ({y}) => {
  const frame = useCurrentFrame();
  const bars = 36;
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: y, height: 220, display: 'flex', alignItems: 'center', gap: 8}}>
      {new Array(bars).fill(0).map((_, i) => {
        const h = 20 + Math.abs(Math.sin(frame / 6 + i * 0.6) * Math.cos(frame / 11 + i * 0.25)) * 200 * (0.4 + random(`b${i}`) * 0.6);
        return <div key={i} style={{flex: 1, height: h, borderRadius: 99, background: neon.green, boxShadow: glow(neon.green, 0.5),
          opacity: interpolate(frame, [0, 20], [0, 0.9], clamp)}} />;
      })}
    </div>
  );
};

const Linguagem: React.FC = () => (
  <AbsoluteFill>
    <Spectrum y={330} />
    <Stack y={80}>
      <Line text="Vídeo é a linguagem das marcas que crescem" size={124} accent={['crescem']} outline={['linguagem']} at={10} stagger={3} />
    </Stack>
  </AbsoluteFill>
);

const SERVICOS = ['Vídeos institucionais', 'Conteúdo para redes sociais', 'Cobertura de eventos', 'Depoimentos de clientes', 'Filmes de produto e marca'];

const Servicos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const active = Math.min(SERVICOS.length - 1, Math.floor(interpolate(frame, [40, 200], [0, SERVICOS.length], clamp)));
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 300}}>
      <div style={{fontFamily: body, fontWeight: 800, fontSize: 38, color: neon.green, letterSpacing: 8, textShadow: glow(neon.green, 0.5),
        opacity: interpolate(frame, [0, 15], [0, 1], clamp)}}>AUDIOVISUAL PARA EMPRESAS</div>
      <div style={{marginTop: 24}}><NeonBar at={6} width={420} /></div>
      <div style={{marginTop: 90, display: 'flex', flexDirection: 'column', gap: 34, width: 900}}>
        {SERVICOS.map((s, i) => {
          const at = 22 + i * 14;
          const p = spring({frame: frame - at, fps, config: {damping: 16}});
          const on = i === active && frame > 40;
          return (
            <div key={s} style={{display: 'flex', alignItems: 'center', gap: 34, padding: '30px 40px', borderRadius: 26,
              border: `3px solid ${on ? neon.green : neon.dim}`, background: on ? `${neon.green}18` : 'rgba(10,25,8,0.55)',
              boxShadow: on ? `${glow(neon.green, 0.8)}, inset 0 0 40px ${neon.green}33` : 'none',
              opacity: p, transform: `translateX(${interpolate(p, [0, 1], [i % 2 ? 300 : -300, 0])}px) scale(${on ? 1.04 : 1})`}}>
              <div style={{fontFamily: display, fontSize: 64, color: on ? neon.green : neon.dim, textShadow: on ? glow(neon.green, 0.6) : 'none', width: 90}}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{fontFamily: body, fontWeight: 800, fontSize: 50, color: on ? neon.ink : `${neon.ink}aa`}}>{s}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Historia: React.FC = () => (
  <Stack gap={30}>
    <Line text="Não fazemos só vídeos." size={110} color={`${neon.ink}88`} at={4} stagger={3} />
    <NeonBar at={30} width={300} />
    <Line text="Contamos a história da sua empresa" size={150} accent={['história']} outline={['empresa']} at={36} stagger={4} />
  </Stack>
);

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoOn = frame < 6 ? 0 : frame < 22 ? (random(`l${frame}`) > 0.45 ? 1 : 0.15) : 1;
  const btn = spring({frame: frame - 50, fps, config: {damping: 12}});
  const tap = frame - 110;
  const press = tap >= 0 && tap < 10 ? interpolate(tap, [0, 4, 10], [1, 0.9, 1]) : 1;
  const pulse = 1 + Math.sin(frame / 7) * 0.03;
  const ripple = interpolate(tap, [0, 30], [0, 1], clamp);
  return (
    <Stack gap={70} y={-60}>
      <div style={{textAlign: 'center', opacity: logoOn}}>
        <div style={{fontFamily: display, fontSize: 210, lineHeight: 0.95, color: 'transparent', WebkitTextStroke: `4px ${neon.green}`,
          filter: `drop-shadow(0 0 12px ${neon.green}) drop-shadow(0 0 40px ${neon.green})`}}>NEXT</div>
        <div style={{fontFamily: display, fontSize: 210, lineHeight: 0.95, color: neon.green, textShadow: glow(neon.green, 1.3)}}>CREATORS</div>
      </div>
      <Sub text="Coloque sua marca em cena." at={30} />
      <div style={{position: 'relative', opacity: btn, transform: `scale(${interpolate(btn, [0, 1], [0.6, 1]) * press * pulse})`}}>
        {tap >= 0 && <div style={{position: 'absolute', inset: -20, borderRadius: 999, border: `4px solid ${neon.green}`,
          transform: `scale(${1 + ripple * 0.5})`, opacity: 1 - ripple}} />}
        <div style={{padding: '40px 90px', borderRadius: 999, background: neon.green, color: neon.bg, fontFamily: body, fontWeight: 900,
          fontSize: 56, letterSpacing: 2, boxShadow: glow(neon.green, 1.4)}}>CHAME NO DIRECT →</div>
      </div>
    </Stack>
  );
};

const RENDER: Record<(typeof SCENES)[number]['id'], React.FC> = {
  hook: Hook, decide: Decide, linguagem: Linguagem, servicos: Servicos, historia: Historia, cta: Cta,
};

export const ReelNeon: React.FC = () => {
  const frame = useCurrentFrame();
  const vol = interpolate(frame, [0, 10, REEL_NEON_DURATION - 40, REEL_NEON_DURATION], [0, 0.9, 0.9, 0], clamp);
  return (
    <AbsoluteFill style={{background: neon.bg}}>
      <Audio src={staticFile('audio/trilha-v2.wav')} volume={vol} />
      <NeonGrid />
      <Particles />
      {timeline.map((s, i) => {
        const C = RENDER[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
            <SceneShell dur={s.dur} first={i === 0} last={i === timeline.length - 1}><C /></SceneShell>
          </Sequence>
        );
      })}
      <Hud />
      <CrtOverlay />
    </AbsoluteFill>
  );
};
