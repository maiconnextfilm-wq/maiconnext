import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import track from '../public/clip/track.json';
import {body, display} from './theme';

/**
 * Cards holográficos ("balões") orbitando em 3D ao redor da pessoa do vídeo.
 * Camadas: vídeo → órbita de trás → pessoa recortada (public/clip/fg) → órbita da frente → textos.
 */
export const BALOES_DURATION = 225;
export const BALOES_W = 1080;
export const BALOES_H = 1440;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

type Card = {title: string; color: string; icon: React.ReactNode; lines?: string[]; ui?: 'timeline' | 'play' | 'chart' | 'stars'; h: number};

const stroke = (c: string) => ({fill: 'none', stroke: c, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const});
const Icon: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => (
  <div style={{width: 84, height: 84, borderRadius: 22, background: 'rgba(8,10,20,0.85)', border: `2px solid ${c}88`, boxShadow: `0 0 18px ${c}66 inset`,
    display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <svg width={50} height={50} viewBox="0 0 24 24" style={{filter: `drop-shadow(0 0 4px ${c})`}}>{children}</svg>
  </div>
);

const CARDS: Card[] = [
  {title: 'Vídeo Institucional', color: '#4DA3FF', h: -330, ui: 'play',
    icon: <><rect x="2.5" y="6" width="13" height="12" rx="2.5" {...stroke('#7cc0ff')} /><path d="M15.5 10.5l6-3.5v10l-6-3.5z" {...stroke('#7cc0ff')} /></>},
  {title: 'Redes Sociais', color: '#B26BFF', h: -40, lines: ['Reels', 'Stories', 'Shorts'],
    icon: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" {...stroke('#d2a6ff')} /><path d="M12 15.5s-3-1.8-3-4a1.6 1.6 0 013-.8 1.6 1.6 0 013 .8c0 2.2-3 4-3 4z" {...stroke('#d2a6ff')} /></>},
  {title: 'Edição & Color', color: '#FF8A3D', h: -250, ui: 'timeline',
    icon: <><circle cx="12" cy="12" r="9" {...stroke('#ffb37d')} /><path d="M12 3v18M3 12h18" {...stroke('#ffb37d')} /><circle cx="12" cy="12" r="3" {...stroke('#ffb37d')} /></>},
  {title: 'Eventos', color: '#2EE6C8', h: 60, lines: ['Cobertura', 'Aftermovie'],
    icon: <><rect x="3" y="5" width="18" height="16" rx="3" {...stroke('#7ff3df')} /><path d="M3 10h18M8 3v4M16 3v4" {...stroke('#7ff3df')} /></>},
  {title: 'Drone & 4K', color: '#FF4FA3', h: -380, ui: 'chart',
    icon: <><circle cx="12" cy="12" r="3" {...stroke('#ff8cc4')} /><path d="M9.5 9.5L6 6M14.5 9.5L18 6M9.5 14.5L6 18M14.5 14.5L18 18" {...stroke('#ff8cc4')} /><circle cx="5" cy="5" r="2.5" {...stroke('#ff8cc4')} /><circle cx="19" cy="5" r="2.5" {...stroke('#ff8cc4')} /><circle cx="5" cy="19" r="2.5" {...stroke('#ff8cc4')} /><circle cx="19" cy="19" r="2.5" {...stroke('#ff8cc4')} /></>},
  {title: 'Depoimentos', color: '#FFD23D', h: -120, ui: 'stars',
    icon: <><path d="M4 5h16v11H9l-5 4z" {...stroke('#ffe38a')} /><path d="M8 9.5h8M8 12.5h5" {...stroke('#ffe38a')} /></>},
];

const MiniUI: React.FC<{ui?: Card['ui']; c: string; frame: number}> = ({ui, c, frame}) => {
  if (ui === 'play') {
    const p = (frame % 90) / 90;
    return (
      <div style={{marginTop: 14, height: 74, borderRadius: 12, background: `linear-gradient(135deg, ${c}55, #0a0f1e)`, position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '20px solid white'}} />
        <div style={{position: 'absolute', left: 10, right: 10, bottom: 10, height: 4, borderRadius: 4, background: '#ffffff33'}}>
          <div style={{width: `${p * 100}%`, height: '100%', background: c, borderRadius: 4, boxShadow: `0 0 8px ${c}`}} />
        </div>
      </div>
    );
  }
  if (ui === 'timeline') {
    return (
      <div style={{marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6}}>
        {[0.7, 0.45, 0.85].map((w, i) => (
          <div key={i} style={{display: 'flex', gap: 4}}>
            <div style={{width: `${w * 60}%`, height: 14, borderRadius: 4, background: i === 1 ? '#ffffff55' : `${c}cc`}} />
            <div style={{flex: 1, height: 14, borderRadius: 4, background: '#ffffff22'}} />
          </div>
        ))}
        <div style={{position: 'relative', height: 2}}>
          <div style={{position: 'absolute', top: -58, left: `${((frame * 1.2) % 100)}%`, width: 2, height: 62, background: '#fff', boxShadow: '0 0 6px #fff'}} />
        </div>
      </div>
    );
  }
  if (ui === 'chart') {
    return (
      <div style={{marginTop: 14, height: 60, display: 'flex', alignItems: 'flex-end', gap: 6}}>
        {new Array(8).fill(0).map((_, i) => (
          <div key={i} style={{flex: 1, borderRadius: 3, background: c, opacity: 0.85, height: `${30 + 70 * Math.abs(Math.sin(frame / 12 + i * 0.8))}%`, boxShadow: `0 0 6px ${c}`}} />
        ))}
      </div>
    );
  }
  if (ui === 'stars') {
    return (
      <div style={{marginTop: 12, display: 'flex', gap: 4}}>
        {new Array(5).fill(0).map((_, i) => {
          const on = interpolate(frame - 30 - i * 5, [0, 8], [0.25, 1], clamp);
          return (
            <svg key={i} width={34} height={34} viewBox="0 0 24 24" style={{opacity: on, filter: `drop-shadow(0 0 5px ${c})`}}>
              <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill={c} />
            </svg>
          );
        })}
      </div>
    );
  }
  return null;
};

const GlassCard: React.FC<{card: Card; frame: number; appear: number}> = ({card, frame, appear}) => {
  const c = card.color;
  const flash = interpolate(appear, [0.6, 1], [1, 0], clamp);
  return (
    <div style={{width: 290, padding: '24px 22px 22px', borderRadius: 30, background: 'linear-gradient(160deg, rgba(255,255,255,0.20), rgba(255,255,255,0.04) 55%, rgba(10,14,30,0.35))',
      backdropFilter: 'blur(10px)', border: `2.5px solid ${c}`, boxShadow: `0 0 ${28 + flash * 60}px ${c}, 0 0 80px ${c}55, inset 0 0 26px ${c}55`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden'}}>
      {/* reflexo do vidro */}
      <div style={{position: 'absolute', top: -80, left: -60, width: 200, height: 260, transform: 'rotate(25deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
        translate: `${((frame * 3) % 600) - 100}px 0`}} />
      <Icon c={c}>{card.icon}</Icon>
      <div style={{marginTop: 14, fontFamily: body, fontWeight: 800, fontSize: 30, color: '#fff', textAlign: 'center', textShadow: `0 0 12px ${c}`}}>{card.title}</div>
      {card.lines && (
        <div style={{marginTop: 12, width: '100%', display: 'flex', flexDirection: 'column', gap: 8}}>
          {card.lines.map((l) => (
            <div key={l} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', fontFamily: body, fontWeight: 600, fontSize: 22, color: '#e9ecff'}}>
              <div style={{width: 10, height: 10, borderRadius: 5, background: c, boxShadow: `0 0 8px ${c}`}} />
              {l}
            </div>
          ))}
        </div>
      )}
      <div style={{width: '100%'}}><MiniUI ui={card.ui} c={c} frame={frame} /></div>
    </div>
  );
};

/** Estado de órbita de cada card no frame atual. */
const useOrbit = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (track.face as number[][])[Math.min(frame, track.face.length - 1)];
  const cx = f[0];
  const cy = f[1] + 140; // centro da órbita: altura do peito/ombros
  const theta0 = -Math.PI / 2 + frame * ((Math.PI * 2) / 300); // 1 volta a cada 10 s
  return CARDS.map((card, i) => {
    const th = theta0 + (i / CARDS.length) * Math.PI * 2;
    const depth = Math.sin(th); // >0 = na frente da pessoa
    const appear = spring({frame: frame - 6 - i * 7, fps, config: {damping: 13, mass: 0.8}});
    const bob = Math.sin(frame / 18 + i * 1.7) * 14;
    // ao passar bem na frente, o card desce para a altura do peito e não cobre o rosto
    const w = Math.max(0, depth) ** 2;
    const yOrbit = cy + card.h + depth * 70 + bob;
    const yChest = f[1] + 420 + bob;
    return {
      card, i, depth, appear,
      x: cx + Math.cos(th) * 450,
      y: yOrbit + (Math.max(yOrbit, yChest) - yOrbit) * w,
      scale: (0.74 + 0.26 * (depth + 1) / 2) * appear,
      rotY: -Math.cos(th) * 38,
    };
  });
};

const CardsLayer: React.FC<{front: boolean}> = ({front}) => {
  const frame = useCurrentFrame();
  const items = useOrbit().filter((o) => (o.depth >= 0) === front).sort((a, b) => a.depth - b.depth);
  return (
    <AbsoluteFill style={{perspective: 1400}}>
      {items.map((o) => (
        <div key={o.i} style={{position: 'absolute', left: o.x, top: o.y, transform: `translate(-50%,-50%) scale(${o.scale}) rotateY(${o.rotY}deg) translateY(${(1 - o.appear) * 120}px)`,
          opacity: Math.min(1, o.appear * 1.4) * (o.depth < 0 ? 0.55 + 0.45 * (1 + o.depth) : 1),
          filter: o.depth < 0 ? `blur(${-o.depth * 2.5}px) brightness(${0.75 + 0.25 * (1 + o.depth)})` : undefined}}>
          <GlassCard card={o.card} frame={frame} appear={o.appear} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

/** Anéis de luz neon girando; metade de trás passa atrás da pessoa. */
const Rings: React.FC<{front: boolean}> = ({front}) => {
  const frame = useCurrentFrame();
  const f = (track.face as number[][])[Math.min(frame, track.face.length - 1)];
  const rings = [
    {rx: 430, ry: 95, dy: 330, tilt: -8, c: '#4DA3FF', speed: 1, delay: 0},
    {rx: 500, ry: 120, dy: 120, tilt: 6, c: '#B26BFF', speed: -0.8, delay: 10},
    {rx: 380, ry: 80, dy: -40, tilt: -4, c: '#2EE6C8', speed: 1.3, delay: 20},
  ];
  return (
    <AbsoluteFill>
      <svg width={BALOES_W} height={BALOES_H} style={{position: 'absolute', overflow: 'visible'}}>
        <defs>
          <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {rings.map((r, i) => {
          const draw = interpolate(frame - r.delay, [0, 30], [0, 1], {...clamp, easing: ease});
          const cx = f[0];
          const cy = f[1] + r.dy;
          // parte de trás = arco superior (sweep 0), frente = arco inferior
          const d = front
            ? `M ${cx - r.rx} ${cy} A ${r.rx} ${r.ry} 0 0 0 ${cx + r.rx} ${cy}`
            : `M ${cx - r.rx} ${cy} A ${r.rx} ${r.ry} 0 0 1 ${cx + r.rx} ${cy}`;
          const len = Math.PI * Math.sqrt((r.rx * r.rx + r.ry * r.ry) / 2);
          const comet = ((frame * 6 * r.speed) % len + len) % len;
          return (
            <g key={i} transform={`rotate(${r.tilt} ${cx} ${cy})`} filter="url(#neon)" opacity={front ? 0.95 : 0.55}>
              <path d={d} fill="none" stroke={r.c} strokeWidth={3} strokeOpacity={0.55} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
              <path d={d} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeDasharray={`${len * 0.18} ${len}`} strokeDashoffset={-comet} opacity={draw} />
              <path d={d} fill="none" stroke={r.c} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${len * 0.3} ${len}`} strokeDashoffset={-comet + len * 0.06} opacity={draw * 0.7} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(40).fill(0).map((_, i) => {
        const x = random(`sx${i}`) * BALOES_W;
        const y = ((random(`sy${i}`) * BALOES_H - frame * (0.6 + random(`sv${i}`) * 1.5)) % BALOES_H + BALOES_H) % BALOES_H;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(frame / (6 + random(`st${i}`) * 10) + i));
        const s = 3 + random(`ss${i}`) * 5;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, background: i % 3 ? '#9fd0ff' : '#e2b8ff', opacity: tw * 0.8, boxShadow: `0 0 ${s * 3}px #8ec8ff`}} />;
      })}
    </AbsoluteFill>
  );
};

const Headline: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame: frame - 40, fps, config: {damping: 16}});
  const b = spring({frame: frame - 52, fps, config: {damping: 14}});
  const glow = 0.7 + 0.3 * Math.sin(frame / 6);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-end', padding: '0 56px 70px'}}>
      <div style={{textAlign: 'right'}}>
        <div style={{fontFamily: body, fontWeight: 800, fontSize: 56, color: '#fff', opacity: a, transform: `translateY(${(1 - a) * 40}px)`, textShadow: '0 4px 20px rgba(0,0,0,0.8)'}}>
          Vamos elevar
        </div>
        <div style={{fontFamily: display, fontSize: 120, lineHeight: 1, letterSpacing: 3, color: '#BFE3FF', opacity: b, transform: `translateY(${(1 - b) * 50}px)`,
          textShadow: `0 0 ${18 * glow}px #4DA3FF, 0 0 ${40 * glow}px #4DA3FF, 0 0 70px #2b6cff`}}>
          SUA MARCA
        </div>
        <div style={{marginTop: 10, fontFamily: body, fontWeight: 800, fontSize: 26, letterSpacing: 8, color: '#ffffffcc', opacity: b}}>NEXT CREATORS</div>
      </div>
    </AbsoluteFill>
  );
};

export const BaloesHolograficos: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12, BALOES_DURATION - 12, BALOES_DURATION - 1], [0, 1, 1, 0], clamp);
  const fg = staticFile(`clip/fg/${String(Math.min(frame, BALOES_DURATION - 1)).padStart(4, '0')}.png`);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: fade}}>
        {/* vídeo original, levemente escurecido e frio para o neon "acender" */}
        <OffthreadVideo src={staticFile('clip/base.mp4')} style={{width: '100%', height: '100%', filter: 'brightness(0.62) saturate(0.85) contrast(1.08)'}} />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,30,80,0.35), rgba(5,8,25,0.15) 50%, rgba(0,0,0,0.65))', mixBlendMode: 'multiply'}} />
        <Rings front={false} />
        <CardsLayer front={false} />
        {/* pessoa recortada (mesma correção de cor do vídeo, um pouco mais clara para destacar) */}
        <Img src={fg} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'brightness(0.8) saturate(0.95) contrast(1.06)'}} />
        <Rings front />
        <CardsLayer front />
        <Sparkles />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(0,0,0,0.6) 100%)'}} />
        <Headline />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
