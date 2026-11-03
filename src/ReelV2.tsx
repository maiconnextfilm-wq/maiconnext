import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FilmTexture, useHandheld} from './components';
import {
  Aperture, CtaButton, DrawPath, ease, FilmStrip, FloatingMarks, NumberBadge, Orbit, PlayButton, Stopwatch, Waveform,
} from './graphics';
import {body, colors, display} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Sobreposição entre cenas (crossfade) em frames. */
const T = 18;

const SCENES = [
  {id: 'hook', dur: 105},
  {id: 'decide', dur: 120},
  {id: 'linguagem', dur: 120},
  {id: 'servicos', dur: 255},
  {id: 'historia', dur: 150},
  {id: 'cta', dur: 195},
] as const;

// Cada cena começa T frames antes da anterior terminar.
const timeline = (() => {
  let at = 0;
  return SCENES.map((s, i) => {
    const from = i === 0 ? 0 : at - T;
    at = from + s.dur;
    return {...s, from};
  });
})();
export const REEL_V2_DURATION = timeline[timeline.length - 1].from + timeline[timeline.length - 1].dur;

/** Envelope de entrada/saída de cada cena: opacidade + desfoque + escala, com easing suave. */
const SceneShell: React.FC<{dur: number; first?: boolean; last?: boolean; children: React.ReactNode}> = ({dur, first, last, children}) => {
  const frame = useCurrentFrame();
  const inP = first ? 1 : interpolate(frame, [0, T], [0, 1], {...clamp, easing: ease});
  const outP = last ? 0 : interpolate(frame, [dur - T, dur], [0, 1], {...clamp, easing: ease});
  const opacity = inP * (1 - outP);
  const blur = (1 - inP) * 18 + outP * 18;
  const scale = interpolate(inP, [0, 1], [0.92, 1]) * interpolate(outP, [0, 1], [1, 1.1]);
  const y = (1 - inP) * 40 - outP * 40;
  return (
    <AbsoluteFill style={{opacity, filter: blur > 0.1 ? `blur(${blur}px)` : undefined, transform: `translateY(${y}px) scale(${scale})`}}>
      {children}
    </AbsoluteFill>
  );
};

/** Feixe de luz suave atravessando a tela nos cortes (substitui o flash duro). */
const LightSweep: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, T + 6], [0, 1], {...clamp, easing: ease});
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: Math.sin(p * Math.PI) * 0.8}}>
      <div style={{position: 'absolute', top: -400, bottom: -400, width: 700, left: interpolate(p, [0, 1], [-900, 1300]), transform: 'rotate(18deg)',
        background: `linear-gradient(90deg, transparent, ${colors.accent2}55, ${colors.ink}66, ${colors.accent}44, transparent)`, filter: 'blur(30px)'}} />
    </AbsoluteFill>
  );
};

/** Texto cinético; o destaque amarelo entra como um "wipe". */
const Kinetic: React.FC<{text: string; delay?: number; size?: number; color?: string; highlight?: string[]; stagger?: number}> = ({
  text, delay = 0, size = 150, color = colors.ink, highlight = [], stagger = 4,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${size * 0.22}px`, fontFamily: display, fontSize: size,
      lineHeight: 1.04, textTransform: 'uppercase', textAlign: 'center'}}>
      {text.split(' ').map((w, i) => {
        const d = delay + i * stagger;
        const p = spring({frame: frame - d, fps, config: {damping: 16, mass: 0.7}});
        const isHl = highlight.includes(w.replace(/[.,!?]/g, ''));
        const wipe = interpolate(frame - d - 8, [0, 14], [0, 1], {...clamp, easing: ease});
        return (
          <span key={i} style={{position: 'relative', display: 'inline-block', padding: isHl ? '0 18px' : 0, opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px)`, filter: `blur(${interpolate(p, [0, 1], [10, 0])}px)`}}>
            {isHl && <span style={{position: 'absolute', inset: '-8% 0 2% 0', background: colors.accent2, transformOrigin: 'left', transform: `scaleX(${wipe})`}} />}
            <span style={{position: 'relative', color: isHl ? interpolateColor(wipe) : color}}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};
const interpolateColor = (t: number) => (t > 0.5 ? colors.bg : colors.ink);

/** Fundo com luzes em movimento. */
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const a = frame * 0.6;
  return (
    <AbsoluteFill style={{background: colors.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1400, height: 1400, left: -500 + Math.sin(a / 60) * 220, top: -300 + Math.cos(a / 80) * 260,
        background: `radial-gradient(circle, ${colors.accent}55 0%, transparent 60%)`, filter: 'blur(40px)'}} />
      <div style={{position: 'absolute', width: 1300, height: 1300, right: -600 + Math.cos(a / 70) * 240, bottom: -400 + Math.sin(a / 50) * 220,
        background: `radial-gradient(circle, ${colors.accent2}40 0%, transparent 60%)`, filter: 'blur(50px)'}} />
      {[1, 2].map((i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: (1080 / 3) * i, top: 0, bottom: 0, width: 1, background: '#ffffff10'}} />
          <div style={{position: 'absolute', top: (1920 / 3) * i, left: 0, right: 0, height: 1, background: '#ffffff10'}} />
        </React.Fragment>
      ))}
      <FloatingMarks />
    </AbsoluteFill>
  );
};

/** Interface de câmera que "abre" no início. */
const Viewfinder: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const open = spring({frame: frame - 6, fps, config: {damping: 18}});
  const s = Math.floor(frame / fps);
  const f = frame % fps;
  const tc = `00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  const pulse = (Math.sin(frame / 5) + 1) / 2;
  const inset = interpolate(open, [0, 1], [380, 0]);
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div style={{position: 'absolute', width: 90, height: 90, borderTop: `5px solid ${colors.ink}`, borderLeft: `5px solid ${colors.ink}`,
      opacity: 0.8 * open, transform: `rotate(${rot}deg)`, ...pos}} />
  );
  const hud = {fontFamily: body, color: colors.ink, opacity: open} as const;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {corner({top: 70 + inset, left: 60 + inset / 2}, 0)}
      {corner({top: 70 + inset, right: 60 + inset / 2}, 90)}
      {corner({bottom: 70 + inset, right: 60 + inset / 2}, 180)}
      {corner({bottom: 70 + inset, left: 60 + inset / 2}, 270)}
      <div style={{...hud, position: 'absolute', top: 100, left: 110, display: 'flex', alignItems: 'center', gap: 16, fontWeight: 800, fontSize: 34, letterSpacing: 2}}>
        <div style={{position: 'relative', width: 26, height: 26}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 13, background: colors.accent, transform: `scale(${1 + pulse * 1.2})`, opacity: (1 - pulse) * 0.5}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: 13, background: colors.accent, opacity: 0.6 + pulse * 0.4}} />
        </div>
        REC
      </div>
      <div style={{...hud, position: 'absolute', top: 100, right: 110, fontWeight: 600, fontSize: 32, fontVariantNumeric: 'tabular-nums'}}>{tc}</div>
      <div style={{...hud, position: 'absolute', bottom: 105, left: 110, fontWeight: 600, fontSize: 26, color: colors.muted, letterSpacing: 3}}>4K · 24FPS · ISO 800</div>
      <div style={{...hud, position: 'absolute', bottom: 100, right: 110, display: 'flex', alignItems: 'center', gap: 14, fontWeight: 800, fontSize: 26, letterSpacing: 3}}>
        <Aperture size={36} /> NEXT CREATORS
      </div>
      {/* barra de progresso do vídeo */}
      <div style={{position: 'absolute', left: 110, right: 110, bottom: 160, height: 4, background: '#ffffff1a', borderRadius: 4, opacity: open}}>
        <div style={{width: `${(frame / REEL_V2_DURATION) * 100}%`, height: '100%', background: colors.accent, borderRadius: 4}} />
      </div>
    </AbsoluteFill>
  );
};

const Center: React.FC<{children: React.ReactNode}> = ({children}) => {
  const shake = useHandheld(6);
  return <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 90px', transform: shake}}>{children}</AbsoluteFill>;
};

const Sub: React.FC<{text: string; delay: number}> = ({text, delay}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - delay, [0, 16], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{marginTop: 50, fontFamily: body, fontWeight: 600, fontSize: 52, color: colors.ink, opacity: o * 0.9, textAlign: 'center',
      transform: `translateY(${(1 - o) * 24}px)`, filter: `blur(${(1 - o) * 6}px)`}}>
      {text}
    </div>
  );
};

// ---------- Cenas ----------

const Hook: React.FC = () => (
  <>
    <Orbit size={900} x={540} y={960} delay={4} />
    <Center>
      <Kinetic text="Sua empresa é vista" size={170} highlight={['vista']} delay={10} />
      <Kinetic text="ou só existe?" size={170} delay={30} />
    </Center>
    <DrawPath d="M180 1420 C 380 1380, 700 1460, 900 1400" delay={45} duration={28} width={8} />
  </>
);

const Decide: React.FC = () => (
  <Center>
    <div style={{marginBottom: 60}}>
      <Stopwatch size={260} delay={4} />
    </div>
    <Kinetic text="Seu cliente decide em segundos" size={140} highlight={['segundos']} delay={8} />
    <Sub text="E ele decide pelo que vê." delay={45} />
  </Center>
);

const Linguagem: React.FC = () => (
  <>
    <Orbit size={620} x={540} y={640} delay={0} speed={-1.4} color={colors.accent2} />
    <Center>
      <div style={{marginBottom: 90}}>
        <PlayButton size={260} delay={4} pressAt={58} />
      </div>
      <Kinetic text="Vídeo é a linguagem das marcas que crescem" size={124} highlight={['crescem']} delay={14} stagger={3} />
    </Center>
  </>
);

const SERVICOS = ['Vídeos institucionais', 'Conteúdo para redes sociais', 'Cobertura de eventos', 'Depoimentos de clientes', 'Filmes de produto e marca'];

const Servicos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shake = useHandheld(4);
  const titleP = spring({frame: frame - 4, fps, config: {damping: 18}});
  const STEP = 32;
  const FIRST = 34;
  const activeIdx = Math.floor((frame - FIRST) / STEP);
  return (
    <AbsoluteFill style={{padding: '290px 100px 0', transform: shake}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: titleP}}>
        <div style={{width: 60 * titleP, height: 4, background: colors.accent2}} />
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 38, color: colors.accent2, letterSpacing: 6}}>AUDIOVISUAL PARA EMPRESAS</div>
      </div>
      <div style={{marginTop: 20, marginBottom: 60, fontFamily: display, fontSize: 116, color: colors.ink, lineHeight: 1, textTransform: 'uppercase',
        opacity: titleP, transform: `translateY(${(1 - titleP) * 50}px)`, filter: `blur(${(1 - titleP) * 10}px)`}}>
        O que a Next Creators faz
      </div>
      <div style={{position: 'relative'}}>
        {/* linha-guia que se desenha ligando os badges */}
        <div style={{position: 'absolute', left: 47, top: 48, width: 3, background: `${colors.ink}33`,
          height: interpolate(frame, [FIRST, FIRST + STEP * 4 + 10], [0, 4 * 150], {...clamp, easing: ease})}} />
        {SERVICOS.map((s, i) => {
          const d = FIRST + i * STEP;
          const p = spring({frame: frame - d, fps, config: {damping: 16}});
          const active = activeIdx === i || (i === SERVICOS.length - 1 && activeIdx >= i);
          const bar = interpolate(frame - d, [4, 24], [0, 1], {...clamp, easing: ease});
          return (
            <div key={s} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 34, height: 150, opacity: p,
              transform: `translateX(${(1 - p) * -100}px)`, filter: `blur(${(1 - p) * 8}px)`}}>
              <NumberBadge n={i + 1} delay={d} active={active} />
              <div style={{position: 'relative', fontFamily: body, fontWeight: 800, fontSize: 54, color: colors.ink}}>
                {s}
                <div style={{position: 'absolute', left: 0, bottom: -12, height: 4, width: `${bar * 100}%`, background: active ? colors.accent : '#ffffff26'}} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Historia: React.FC = () => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [20, 50], [0, 1], {...clamp, easing: ease});
  return (
    <>
      <FilmStrip y={260} angle={-10} speed={5} />
      <FilmStrip y={1500} angle={-10} speed={-4} opacity={0.18} />
      <Center>
        <Kinetic text="Não fazemos só vídeos." size={124} color={colors.muted} delay={6} />
        <div style={{height: 50}} />
        <Kinetic text="Contamos a história da sua empresa" size={144} highlight={['história']} delay={38} />
        <div style={{marginTop: 70, opacity: w, transform: `scaleX(${w})`}}>
          <Waveform width={620} height={100} />
        </div>
      </Center>
    </>
  );
};

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logo = spring({frame: frame - 4, fps, config: {damping: 14}});
  const line = interpolate(frame, [20, 45], [0, 1], {...clamp, easing: ease});
  const letters = 'CREATORS'.split('');
  return (
    <>
      <Orbit size={1000} x={540} y={820} delay={0} speed={0.6} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{opacity: logo, transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`, marginBottom: 20}}>
          <Aperture size={120} color={colors.accent2} />
        </div>
        <div style={{textAlign: 'center'}}>
          <div style={{fontFamily: display, fontSize: 230, color: colors.ink, lineHeight: 0.9, opacity: logo,
            transform: `translateY(${(1 - logo) * 60}px)`, filter: `blur(${(1 - logo) * 14}px)`, letterSpacing: interpolate(logo, [0, 1], [40, 2])}}>
            NEXT
          </div>
          <div style={{fontFamily: display, fontSize: 150, color: colors.accent, lineHeight: 1, letterSpacing: 6, display: 'flex', justifyContent: 'center'}}>
            {letters.map((l, i) => {
              const p = spring({frame: frame - 14 - i * 2.5, fps, config: {damping: 12}});
              return <span key={i} style={{display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 80}px) rotate(${(1 - p) * 20}deg)`}}>{l}</span>;
            })}
          </div>
        </div>
        <div style={{width: 600 * line, height: 6, background: colors.accent2, margin: '40px 0', borderRadius: 6}} />
        <div style={{fontFamily: body, fontWeight: 600, fontSize: 46, color: colors.ink, opacity: line, letterSpacing: interpolate(line, [0, 1], [18, 4])}}>
          AUDIOVISUAL PARA EMPRESAS
        </div>
        <div style={{marginTop: 110}}>
          <CtaButton label={<>Chame no direct<br />e coloque sua marca em cena</>} delay={50} tapAt={110} />
        </div>
      </AbsoluteFill>
    </>
  );
};

const COMPONENTS: Record<(typeof SCENES)[number]['id'], React.FC> = {
  hook: Hook, decide: Decide, linguagem: Linguagem, servicos: Servicos, historia: Historia, cta: Cta,
};

/** Fade de abertura (do preto, com desfoque) e de encerramento (íris fechando para o preto). */
const GlobalFades: React.FC = () => {
  const frame = useCurrentFrame();
  const inO = interpolate(frame, [0, 24], [1, 0], {...clamp, easing: ease});
  const outP = interpolate(frame, [REEL_V2_DURATION - 36, REEL_V2_DURATION - 2], [0, 1], {...clamp, easing: ease});
  const r = interpolate(outP, [0, 1], [1500, 0]);
  return (
    <>
      <AbsoluteFill style={{background: '#000', opacity: inO, pointerEvents: 'none'}} />
      {outP > 0 && (
        <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(circle at 50% 50%, transparent ${r * 0.85}px, #000 ${r}px)`}} />
      )}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(outP, [0.6, 1], [0, 1], clamp), pointerEvents: 'none'}} />
    </>
  );
};

export const NextCreatorsReelV2: React.FC = () => {
  const frame = useCurrentFrame();
  const blurIn = interpolate(frame, [0, 30], [20, 0], {...clamp, easing: ease});
  const zoomIn = interpolate(frame, [0, 40], [1.08, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* Trilha original sincronizada (gerada por scripts/trilha.py) */}
      <Audio src={staticFile('audio/trilha-v2.wav')} />
      <AbsoluteFill style={{filter: blurIn > 0.1 ? `blur(${blurIn}px)` : undefined, transform: `scale(${zoomIn})`}}>
        <Background />
        {timeline.map((s, i) => {
          const C = COMPONENTS[s.id];
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
              <SceneShell dur={s.dur} first={i === 0} last={i === timeline.length - 1}>
                <C />
              </SceneShell>
            </Sequence>
          );
        })}
        {timeline.slice(1).map((s) => (
          <LightSweep key={s.id} at={s.from} />
        ))}
        <Viewfinder />
        <FilmTexture />
      </AbsoluteFill>
      <GlobalFades />
    </AbsoluteFill>
  );
};
