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
O vídeo sai sem áudio, para usar uma música em alta direto no Instagram.
