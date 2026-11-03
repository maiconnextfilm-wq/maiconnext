import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Flash, FilmTexture, KineticLine, Viewfinder, useHandheld} from './components';
import {body, colors, display} from './theme';

// Duração de cada cena em frames (30 fps)
const SCENES = {
  hook: 90,
  decide: 105,
  linguagem: 120,
  servicos: 255,
  historia: 150,
  cta: 180,
};
export const REEL_DURATION = Object.values(SCENES).reduce((a, b) => a + b, 0);

const starts = (() => {
  let acc = 0;
  const out: Record<keyof typeof SCENES, number> = {} as never;
  (Object.keys(SCENES) as (keyof typeof SCENES)[]).forEach((k) => {
    out[k] = acc;
    acc += SCENES[k];
  });
  return out;
})();

/** Fundo com "light leaks" em movimento, como luz de set. */
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const a = frame * 0.6;
  return (
    <AbsoluteFill style={{background: colors.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          left: -500 + Math.sin(a / 60) * 200,
          top: -300 + Math.cos(a / 80) * 250,
          background: `radial-gradient(circle, ${colors.accent}55 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          right: -600 + Math.cos(a / 70) * 220,
          bottom: -400 + Math.sin(a / 50) * 200,
          background: `radial-gradient(circle, ${colors.accent2}40 0%, transparent 60%)`,
          filter: 'blur(50px)',
        }}
      />
      {/* linhas de grade de enquadramento (regra dos terços) */}
      {[1, 2].map((i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: (1080 / 3) * i, top: 0, bottom: 0, width: 1, background: '#ffffff12'}} />
          <div style={{position: 'absolute', top: (1920 / 3) * i, left: 0, right: 0, height: 1, background: '#ffffff12'}} />
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};

const Center: React.FC<{children: React.ReactNode}> = ({children}) => {
  const shake = useHandheld(8);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 90px', transform: shake}}>
      {children}
    </AbsoluteFill>
  );
};

const Sub: React.FC<{text: string; delay: number}> = ({text, delay}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        marginTop: 50,
        fontFamily: body,
        fontWeight: 600,
        fontSize: 52,
        color: colors.ink,
        opacity: o * 0.9,
        textAlign: 'center',
        transform: `translateY(${(1 - o) * 20}px)`,
      }}
    >
      {text}
    </div>
  );
};

// 1. Gancho
const Hook: React.FC = () => (
  <Center>
    <KineticLine text="Sua empresa é vista" size={170} highlight={['vista']} />
    <KineticLine text="ou só existe?" size={170} delay={18} color={colors.ink} />
  </Center>
);

// 2. Decisão em segundos
const Decide: React.FC = () => (
  <Center>
    <KineticLine text="Seu cliente decide em segundos" size={150} highlight={['segundos']} />
    <Sub text="E ele decide pelo que vê." delay={35} />
  </Center>
);

// 3. Vídeo é a linguagem
const Linguagem: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - 10, fps, config: {damping: 200}});
  return (
    <Center>
      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: 110,
          border: `8px solid ${colors.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 70,
          transform: `scale(${p}) rotate(${(1 - p) * -90}deg)`,
        }}
      >
        {/* botão play */}
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: 18,
            borderTop: '50px solid transparent',
            borderBottom: '50px solid transparent',
            borderLeft: `80px solid ${colors.accent}`,
          }}
        />
      </div>
      <KineticLine text="Vídeo é a linguagem das marcas que crescem" size={128} highlight={['crescem']} delay={8} stagger={3} />
    </Center>
  );
};

// 4. Serviços
const SERVICOS = [
  'Vídeos institucionais',
  'Conteúdo para redes sociais',
  'Cobertura de eventos',
  'Depoimentos de clientes',
  'Filmes de produto e marca',
];

const Servicos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shake = useHandheld(5);
  return (
    <AbsoluteFill style={{padding: '300px 110px 0', transform: shake}}>
      <div style={{fontFamily: body, fontWeight: 800, fontSize: 40, color: colors.accent2, letterSpacing: 6}}>
        AUDIOVISUAL PARA EMPRESAS
      </div>
      <div style={{marginTop: 20, marginBottom: 70}}>
        <div style={{fontFamily: display, fontSize: 120, color: colors.ink, lineHeight: 1, textTransform: 'uppercase'}}>
          O que a Next Creators faz
        </div>
      </div>
      {SERVICOS.map((s, i) => {
        const d = 30 + i * 32;
        const p = spring({frame: frame - d, fps, config: {damping: 15}});
        const active = frame >= d && frame < d + 32;
        return (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 36,
              padding: '26px 0',
              borderBottom: `2px solid #ffffff22`,
              opacity: p,
              transform: `translateX(${(1 - p) * -120}px)`,
            }}
          >
            <div
              style={{
                fontFamily: display,
                fontSize: 64,
                color: active ? colors.accent : colors.muted,
                width: 110,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{fontFamily: body, fontWeight: 800, fontSize: 52, color: colors.ink}}>{s}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 5. História
const Historia: React.FC = () => (
  <Center>
    <KineticLine text="Não fazemos só vídeos." size={130} color={colors.muted} />
    <div style={{height: 60}} />
    <KineticLine text="Contamos a história da sua empresa" size={150} highlight={['história']} delay={35} />
  </Center>
);

// 6. Logo + CTA
const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logo = spring({frame, fps, config: {damping: 12}});
  const line = interpolate(frame, [15, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cta = spring({frame: frame - 50, fps, config: {damping: 14}});
  const pulse = 1 + Math.sin(frame / 6) * 0.025;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: `scale(${interpolate(logo, [0, 1], [1.6, 1])})`, opacity: logo, textAlign: 'center'}}>
        <div style={{fontFamily: display, fontSize: 230, color: colors.ink, lineHeight: 0.9}}>NEXT</div>
        <div style={{fontFamily: display, fontSize: 150, color: colors.accent, lineHeight: 1, letterSpacing: 6}}>
          CREATORS
        </div>
      </div>
      <div style={{width: 600 * line, height: 6, background: colors.accent2, margin: '40px 0'}} />
      <div style={{fontFamily: body, fontWeight: 600, fontSize: 48, color: colors.ink, opacity: line, letterSpacing: 4}}>
        AUDIOVISUAL PARA EMPRESAS
      </div>
      <div
        style={{
          marginTop: 110,
          padding: '34px 60px',
          borderRadius: 999,
          background: colors.accent,
          fontFamily: body,
          fontWeight: 800,
          fontSize: 46,
          color: colors.ink,
          textAlign: 'center',
          maxWidth: 820,
          lineHeight: 1.25,
          opacity: cta,
          transform: `translateY(${(1 - cta) * 60}px) scale(${pulse})`,
        }}
      >
        <>Chame no direct<br />e coloque sua marca em cena</>
      </div>
    </AbsoluteFill>
  );
};

export const NextCreatorsReel: React.FC = () => {
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Background />
      <Sequence durationInFrames={SCENES.hook}>
        <Hook />
      </Sequence>
      <Sequence from={starts.decide} durationInFrames={SCENES.decide}>
        <Decide />
      </Sequence>
      <Sequence from={starts.linguagem} durationInFrames={SCENES.linguagem}>
        <Linguagem />
      </Sequence>
      <Sequence from={starts.servicos} durationInFrames={SCENES.servicos}>
        <Servicos />
      </Sequence>
      <Sequence from={starts.historia} durationInFrames={SCENES.historia}>
        <Historia />
      </Sequence>
      <Sequence from={starts.cta} durationInFrames={SCENES.cta}>
        <Cta />
      </Sequence>
      {Object.values(starts)
        .slice(1)
        .map((s) => (
          <Flash key={s} at={s} />
        ))}
      <Viewfinder />
      <FilmTexture />
    </AbsoluteFill>
  );
};
