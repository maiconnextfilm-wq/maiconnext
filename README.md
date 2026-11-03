# Next Creators — Reel "Audiovisual para empresas"

Reel vertical (1080×1920, 30 fps, 30 s) feito com [Remotion](https://remotion.dev).

```bash
npm install
npm run studio   # editar/visualizar no navegador
npm run render     # v1 → out/next-creators-reel.mp4
npm run render:v2  # v2 → out/next-creators-reel-v2.mp4
```

- v1: `src/NextCreatorsReel.tsx`
- v2 (transições suaves, grafismos e botões animados): `src/ReelV2.tsx` + `src/graphics.tsx`

Roteiro e tempos ficam no array/objeto `SCENES` de cada arquivo. Cores e fontes: `src/theme.ts`.
A v1 sai sem áudio. A v2 tem trilha original sintetizada (livre de direitos), sincronizada com as cenas:
`npm run trilha` regera `public/audio/trilha-v2.wav` a partir de `scripts/trilha.py` (requer `numpy` e `scipy`).

## Cards holográficos orbitando (`BaloesHolograficos`)

Cards de vidro neon com os serviços da Next Creators girando em órbita 3D ao redor da pessoa do vídeo
(passam por trás e pela frente), com anéis de luz, partículas e o título "Vamos elevar SUA MARCA".

1. Converta o vídeo para `public/clip/base.mp4` (1080×1440, de pé):
   `ffmpeg -i IMG_4176.MOV -vf "scale=1080:1440,format=yuv420p" -c:v libx264 -crf 16 -c:a aac public/clip/base.mp4`
2. Recorte a pessoa (MediaPipe, gera `public/clip/fg/*.png` e `public/clip/track.json`):
   `pip install mediapipe opencv-python-headless && python3 scripts/recorte.py selfie_multiclass_256x256.tflite`
3. `npm run render:baloes` → `out/baloes-holograficos.mp4`

Os cards (títulos, cores, ícones) ficam no array `CARDS` de `src/Baloes.tsx`.
A pasta `public/clip/` não vai para o git (vídeo pessoal e ~480 MB de PNGs).
