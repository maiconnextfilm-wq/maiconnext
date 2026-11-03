"""
Trilha sonora original do Reel Next Creators v2 (sintetizada, livre de direitos).

Gera public/audio/trilha-v2.wav sincronizada com a timeline de src/ReelV2.tsx:
batida eletrônica/cinematográfica a 120 BPM em Lá menor (Am–F–C–G),
whooshes nas transições, impacto no logo, ticks do cronômetro e cliques nos botões.

Uso: python3 scripts/trilha.py
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
from pathlib import Path

SR = 44100
FPS = 30
BPM = 120
BEAT = 60 / BPM          # 0,5 s
BAR = BEAT * 4           # 2 s
DUR = 855 / FPS          # 28,5 s (REEL_V2_DURATION)
N = int(DUR * SR) + SR   # +1 s de cauda (cortada no final)
rng = np.random.default_rng(7)

# Início de cada cena (frames) — espelha a timeline de ReelV2.tsx (T = 18)
SCENE = {'hook': 0, 'decide': 87, 'linguagem': 189, 'servicos': 291, 'historia': 528, 'cta': 660}
sec = lambda f: f / FPS

L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)


def env(n, a=0.005, d=None, curve=6.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if d:
        e *= np.exp(-curve * t / d)
    return e


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 14):
        if freq * k > 12000:
            break
        out += np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k
    return out * 0.6


# ---------- instrumentos ----------
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + filt(rng.standard_normal(n), 'highpass', 3000) * np.exp(-t * 120) * 0.15


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    x = filt(rng.standard_normal(n), 'bandpass', [900, 5000])
    e = np.exp(-t * 18)
    for d in (0.0, 0.011, 0.022):
        e += np.exp(-np.maximum(t - d, 0) * 160) * (t >= d)
    return x * e * 0.35


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), 'highpass', 7000) * np.exp(-t * (14 if open_ else 70)) * 0.25


def pluck(m, dur=0.35):
    n = int(dur * SR)
    x = saw(note(m), n) * 0.5 + np.sin(2 * np.pi * note(m) * np.arange(n) / SR) * 0.5
    return filt(x, 'lowpass', 3200) * env(n, 0.002, dur, 5)


def pad(chord, dur):
    n = int(dur * SR)
    x = np.zeros(n)
    for m in chord:
        for dt in (-0.004, 0.0, 0.0045):
            x += saw(note(m), n, dt)
    x = filt(x, 'lowpass', 1400)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5)
    return x * e / (len(chord) * 3)


def bass(m, dur):
    n = int(dur * SR)
    x = saw(note(m), n) + np.sin(2 * np.pi * note(m) / 2 * np.arange(n) / SR) * 0.8
    return filt(x, 'lowpass', 380) * env(n, 0.004, dur * 1.2, 3)


def whoosh(length=0.9, rise=True):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # varredura de filtro em blocos
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        s, e = b * n // blocks, (b + 1) * n // blocks
        p = b / (blocks - 1)
        fc = 400 + (6000 if rise else 6000 * (1 - p)) * (p if rise else 1)
        out[s:e] = filt(x[s:e], 'bandpass', [max(200, fc * 0.5), min(16000, fc * 1.6)])
    shape = np.sin(np.pi * t / length) ** 2
    return out * shape * 0.5


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    p = t / length
    f = 200 * (2 ** (p * 3))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    noise = filt(rng.standard_normal(n), 'highpass', 2500) * 0.35
    return (tone + noise) * p ** 2


def impact():
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    crash = filt(rng.standard_normal(n), 'highpass', 1500) * np.exp(-t * 2.8) * 0.35
    return boom + crash


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 250) * 0.5


def click():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 90) + np.sin(2 * np.pi * 600 * t) * np.exp(-t * 40) * 0.6) * 0.6


def pop(m):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = note(m) * (1 + 0.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.5


# ---------- arranjo ----------
CHORDS = [  # Am – F – C – G (um acorde por compasso)
    (57, [57, 60, 64, 69], 45),
    (53, [53, 57, 60, 65], 41),
    (48, [52, 55, 60, 64], 48),
    (55, [55, 59, 62, 67], 43),
]
n_bars = int(np.ceil(DUR / BAR))
t_hist, t_cta = sec(SCENE['historia']), sec(SCENE['cta'])  # 17,6 s e 22,0 s (downbeat)

for b in range(n_bars):
    t0 = b * BAR
    root, chord, bnote = CHORDS[b % 4]
    breakdown = 18.0 <= t0 < 22.0
    # Pad — sempre presente, mais forte no breakdown
    add(pad(chord, BAR + 0.4), t0, 0.55 if breakdown else 0.4, 0)
    # Arpejo em semicolcheias (entra no compasso 1)
    if b >= 1:
        arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 12, chord[1] + 12, chord[3] + 12, chord[2] + 24]
        for s in range(16):
            g = 0.16 if not breakdown else 0.2
            add(pluck(arp[s % 8], 0.28), t0 + s * BEAT / 4, g * (1.0 if s % 4 == 0 else 0.7), 0.35 if s % 2 else -0.35)
    if breakdown:
        continue
    # Bumbo (a partir da cena "decide")
    for q in range(4):
        tq = t0 + q * BEAT
        if tq >= 2.9:
            add(kick(), tq, 0.9)
    # Baixo em colcheias (a partir de "linguagem")
    if t0 >= 6.0:
        for e in range(8):
            add(bass(bnote if e % 8 != 7 else bnote + 7, BEAT / 2), t0 + e * BEAT / 2, 0.5)
    # Palmas e hi-hats (a partir de "serviços")
    if t0 >= 8.0:
        for q in (1, 3):
            add(clap(), t0 + q * BEAT, 0.8)
        for e in range(8):
            add(hat(open_=(e % 2 == 1)), t0 + e * BEAT / 2, 0.5 if e % 2 else 0.35, 0.2)

# Sidechain: abaixa pad/arpejo/baixo a cada batida para "respirar" com o bumbo
t_all = np.arange(N) / SR
duck = 1 - 0.45 * np.exp(-((t_all % BEAT) / 0.12)) * ((t_all >= 2.9) & ~((t_all >= 18.0) & (t_all < 22.0)))
L *= duck
R *= duck

# ---------- efeitos sincronizados com a imagem ----------
add(impact(), 0.15, 0.6)                                 # abertura
add(riser(2.0), 0.9, 0.35)                               # sobe até a 1ª transição
for name in ('decide', 'linguagem', 'servicos', 'historia', 'cta'):
    ts = sec(SCENE[name])
    add(whoosh(0.9), ts - 0.2, 0.55, -0.3)               # whoosh no crossfade
    add(whoosh(0.7, rise=False), ts + 0.25, 0.3, 0.3)
for k in range(8):                                       # ticks do cronômetro
    add(tick(), sec(SCENE['decide'] + 9) + k * 0.25, 0.35)
add(click(), sec(SCENE['linguagem'] + 58), 0.8)          # clique no play
for i in range(5):                                       # itens da lista de serviços
    add(pop(76 + [0, 3, 5, 7, 12][i]), sec(SCENE['servicos'] + 34 + i * 32), 0.35)
add(riser(4.0), t_cta - 4.0, 0.55)                       # breakdown → drop no logo
add(impact(), t_cta, 0.85)
add(click(), sec(SCENE['cta'] + 110), 0.9)               # toque no botão CTA
add(impact(), sec(840), 0.35)                            # batida final

# ---------- master ----------
ir_n = int(1.8 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2)
ir = filt(ir, 'lowpass', 5000)
ir /= np.sqrt(np.sum(ir ** 2))
wetL = fftconvolve(L, ir)[:N]
wetR = fftconvolve(R, ir[::-1].copy())[:N]
L = L + wetL * 0.18
R = R + wetR * 0.18

stereo = np.stack([L, R], axis=1)
stereo = filt(stereo.T, 'highpass', 30).T
stereo = np.tanh(stereo * 1.4) / np.tanh(1.4)                   # saturação/limiter suave
fade_in = np.minimum(1, t_all / 0.05)
fade_out = np.clip((DUR - t_all) / 1.4, 0, 1) ** 1.5           # acompanha a íris final
stereo *= (fade_in * fade_out)[:, None]
stereo = stereo[: int(DUR * SR)]
stereo /= np.max(np.abs(stereo)) / 0.89                          # pico ≈ -1 dBFS

out = Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'trilha-v2.wav'
wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
print(f'ok → {out} ({len(stereo) / SR:.2f} s)')
