"""
Som da intro premium (sintetizado, livre de direitos) — só precisa de numpy.

Gera public/audio/intro-premium.wav sincronizado com AT em src/IntroPremium.tsx:
drone grave "de outro mundo", brilhos de vidro enquanto as partículas espiralam,
tiques delicados no anel graduado, swell reverso até o logo, impacto grave suave
com acorde de sinos, chime no subtítulo e cauda longa com reverb.

Uso: python3 scripts/intro_premium_som.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
FPS = 30
DUR = 300 / FPS
N = int(DUR * SR)
AT = {'swarm': 10, 'sphere': 36, 'rings': 48, 'annot': 60, 'glyphs': 84, 'logo': 150, 'creators': 172, 'tagline': 205,
      'sweep': 222, 'outro': 266}
sec = lambda f: f / FPS
rng = np.random.default_rng(11)
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


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, len(x))


def env(t, a, d):
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-np.maximum(t - a, 0) / d)


def bell(f, d=3.0):
    t = tt(d)
    # sino de vidro: parciais inarmônicas com decaimentos diferentes
    s = np.zeros_like(t)
    for k, (m, g, dec) in enumerate([(1, 1, 1.0), (2.76, 0.5, 0.5), (5.4, 0.25, 0.25), (8.93, 0.12, 0.15)]):
        s += g * np.sin(2 * np.pi * f * m * t + k) * np.exp(-t / (d * dec * 0.4))
    return s * np.minimum(t / 0.004, 1)


# 1) drone grave: Lá 55 Hz + quinta, com batimento lento e vento filtrado
t = tt(DUR)
drone = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 55.35 * t) + 0.5 * np.sin(2 * np.pi * 82.41 * t)
         + 0.25 * np.sin(2 * np.pi * 110.2 * t + np.sin(2 * np.pi * 0.2 * t) * 2))
drone *= (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t)) * np.minimum(t / 2.5, 1)
wind = fft_filter(rng.standard_normal(N), lo=150, hi=900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t + 1))
shape = np.interp(t, [0, 2, sec(AT['logo']), sec(AT['logo']) + 0.3, sec(AT['outro']), DUR], [0, 0.8, 1, 0.55, 0.55, 0])
add(drone * 0.16 * shape, 0)
add(wind * 0.05 * shape, 0, pan=-0.2)
add(np.roll(wind, 3000) * 0.05 * shape, 0, pan=0.2)

# 2) brilhos de vidro enquanto as partículas espiralam (escala pentatônica aguda)
penta = [880, 987.77, 1174.66, 1318.51, 1567.98, 1760, 1975.53, 2349.32]
for k in range(46):
    at = sec(AT['swarm']) + rng.random() ** 0.8 * sec(AT['logo'] - AT['swarm'] - 10)
    add(bell(rng.choice(penta), 1.6), at, 0.035 + rng.random() * 0.03, pan=rng.uniform(-0.9, 0.9))

# 3) tiques do anel graduado (acelerando)
ticks = np.cumsum(np.linspace(0.11, 0.035, 34))
for k, dt in enumerate(ticks):
    tk = tt(0.03)
    click = fft_filter(rng.standard_normal(len(tk)), lo=3000, hi=9000) * env(tk, 0.0005, 0.004)
    add(click, sec(AT['rings']) + dt * 1.2, 0.18, pan=np.sin(k * 0.5) * 0.6)

# 4) glifos acendendo: blips digitais suaves
for k in range(14):
    tk = tt(0.08)
    f = 2400 + 300 * (k % 4)
    add(np.sin(2 * np.pi * f * tk) * env(tk, 0.002, 0.02), sec(AT['glyphs']) + k * 0.1, 0.05, pan=rng.uniform(-0.6, 0.6))

# 5) swell reverso até o logo
d = 3.2
tk = tt(d)
sw = fft_filter(rng.standard_normal(len(tk)), lo=400, hi=7000) * (tk / d) ** 3
sw += np.sin(2 * np.pi * np.cumsum(220 + 660 * (tk / d) ** 2) / SR) * 0.3 * (tk / d) ** 3
sw += sum(np.sin(2 * np.pi * f * tk) for f in (440, 659.25, 880)) * 0.12 * (tk / d) ** 4
add(sw, sec(AT['logo']) - d, 0.32)

# 6) impacto no logo: sub suave + acorde de sinos (Lá menor add9)
tk = tt(4)
sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tk * 2.5) + 36) / SR) * env(tk, 0.01, 1.4)
add(sub, sec(AT['logo']), 0.6)
for f, pan in ((220, -0.3), (329.63, 0.3), (493.88, -0.5), (659.25, 0.5), (987.77, 0)):
    add(bell(f, 5.0), sec(AT['logo']), 0.09, pan=pan)
air = fft_filter(rng.standard_normal(len(tk)), lo=2000, hi=12000) * env(tk, 0.005, 0.5)
add(air, sec(AT['logo']), 0.06)

# 7) CREATORS: segundo toque, mais leve
for f, pan in ((440, -0.2), (659.25, 0.2), (1318.51, 0)):
    add(bell(f, 3.0), sec(AT['creators']), 0.05, pan=pan)

# 8) subtítulo + reflexo: chime delicado e brilho ascendente
for k, f in enumerate((1760, 2093, 2637, 3136)):
    add(bell(f, 2.0), sec(AT['tagline']) + k * 0.07, 0.03, pan=-0.4 + k * 0.27)
tk = tt(1.2)
add(sum(np.sin(2 * np.pi * f * tk) for f in (2637, 3520, 4186)) * env(tk, 0.4, 0.35) * 0.1, sec(AT['sweep']), 0.4, pan=0.3)

# reverb: convolução com ruído de decaimento exponencial (2,8 s)
ir_t = tt(2.8)
irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.75)
irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.75)


def conv(x, ir):
    n = len(x) + len(ir)
    return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]


wetL = fft_filter(conv(L, irL), hi=6000)
wetR = fft_filter(conv(R, irR), hi=6000)
wetL /= np.max(np.abs(wetL)) + 1e-9
wetR /= np.max(np.abs(wetR)) + 1e-9
dry = np.stack([L, R], axis=1)
dry /= np.max(np.abs(dry)) + 1e-9
mix = dry * 0.75 + np.stack([wetL, wetR], axis=1) * 0.35

mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.2) / np.tanh(1.2) * 0.9
mix *= np.interp(np.arange(N) / SR, [0, DUR - 0.8, DUR], [1, 1, 0])[:, None]

out = Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'intro-premium.wav'
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out)
