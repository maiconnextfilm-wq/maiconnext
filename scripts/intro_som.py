"""
Som da intro neon (sintetizado, livre de direitos) — só precisa de numpy.

Gera public/audio/intro-neon.wav sincronizado com AT em src/IntroNeon.tsx:
faísca elétrica, riser, impacto grave + "zap" no logo, zumbido de neon,
cliques de digitação no subtítulo, brilho no feixe de luz e whoosh/impacto na saída.

Uso: python3 scripts/intro_som.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
FPS = 30
DUR = 240 / FPS
N = int(DUR * SR)
AT = {'spark': 0, 'open': 22, 'next': 34, 'creators': 66, 'tagline': 92, 'sweep': 104, 'outro': 204}
sec = lambda f: f / FPS
rng = np.random.default_rng(3)
L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))


def tt(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, cutoff):
    # filtro de 1 polo (corte pode variar no tempo)
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def env(t, a, d):
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-np.maximum(t - a, 0) / d)


# 1) faísca correndo (crepitar elétrico) — durante a linha
t = tt(sec(AT['open']))
crackle = rng.standard_normal(len(t)) * (rng.random(len(t)) < 0.02) * 3
crackle += np.sin(2 * np.pi * (2000 + 3000 * t / t[-1]) * t) * 0.08
add(crackle * np.linspace(0.3, 1, len(t)), 0, 0.35)

# 2) riser até o impacto do CREATORS
d = sec(AT['creators'] - AT['spark'])
t = tt(d)
noise = rng.standard_normal(len(t))
riser = lowpass(noise, 200 + 6000 * (t / d) ** 2) * (t / d) ** 2
riser += np.sin(2 * np.pi * np.cumsum(80 + 600 * (t / d) ** 2) / SR) * 0.25 * (t / d) ** 2
add(riser, 0, 0.5)

# 3) "abre" com flash: whoosh curto
t = tt(0.6)
add(lowpass(rng.standard_normal(len(t)), 3000) * env(t, 0.05, 0.15), sec(AT['open']), 0.5)

# 4) cada letra do NEXT acendendo: zap/clique de neon
for i in range(4):
    t = tt(0.25)
    zap = np.sign(np.sin(2 * np.pi * 120 * t)) * 0.3 + rng.standard_normal(len(t)) * 0.5
    add(lowpass(zap, 4000) * env(t, 0.002, 0.05), sec(AT['next'] + i * 6), 0.35, pan=(-0.6 + i * 0.4))

# 5) impacto: sub grave descendente + estalo + cauda
t = tt(2.5)
sub = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t * 3) + 38) / SR) * env(t, 0.005, 0.7)
snap = lowpass(rng.standard_normal(len(t)), 6000) * env(t, 0.001, 0.04)
tail = lowpass(rng.standard_normal(len(t)), 900) * env(t, 0.02, 0.9) * 0.4
add(sub * 1.1 + snap * 0.8 + tail, sec(AT['creators']), 0.9)

# 6) zumbido de neon (hum 60 Hz + harmônicos) do impacto até a saída
start, end = sec(AT['creators']), sec(AT['outro'] + 20)
t = tt(end - start)
hum = sum(np.sin(2 * np.pi * 60 * k * t) / k for k in (1, 2, 3, 5)) * 0.25
hum *= np.minimum(t / 0.4, 1) * np.minimum((t[-1] - t) / 0.5, 1)
add(hum, start, 0.18)

# pad suave (Lá menor) para dar clima
for f in (110, 164.81, 220, 261.63):
    pad = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t)) * np.minimum(t / 1.2, 1) * np.minimum((t[-1] - t) / 0.6, 1)
    add(pad, start, 0.05, pan=rng.uniform(-0.5, 0.5))

# 7) digitação do subtítulo
for k in range(14):
    t = tt(0.05)
    add(lowpass(rng.standard_normal(len(t)), 7000) * env(t, 0.001, 0.008), sec(AT['tagline']) + k * (26 / FPS / 14), 0.25,
        pan=rng.uniform(-0.3, 0.3))

# 8) brilho do feixe de luz
t = tt(1.0)
shimmer = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2217, 2637, 3520)) * env(t, 0.2, 0.3) * 0.12
add(shimmer, sec(AT['sweep']), 0.6, pan=-0.3)

# 9) saída: whoosh crescente + impacto final
d = sec(240 - AT['outro'])
t = tt(d)
add(lowpass(rng.standard_normal(len(t)), 300 + 8000 * (t / d) ** 3) * (t / d) ** 2, sec(AT['outro']), 0.6)
t = tt(0.4)
add(np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t * 6) + 40) / SR) * env(t, 0.003, 0.15), sec(240 - 14), 0.8)

# master: normaliza e limita suave
mix = np.stack([L, R], axis=1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.4) / np.tanh(1.4) * 0.92
fade = np.ones(N)
fade[-int(0.05 * SR):] = np.linspace(1, 0, int(0.05 * SR))
mix *= fade[:, None]

out = Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'intro-neon.wav'
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out)
