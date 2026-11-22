# Next Film Color

App web para criar **LUTs (.cube) para vídeo** e **presets (.xmp) para Lightroom** a partir de uma imagem de referência. Roda 100% no navegador: as imagens não saem do aparelho e não precisa de servidor.

## Como abrir

Abra `index.html` no navegador, ou sirva a pasta:

```bash
cd color-tools && python3 -m http.server 8080   # http://localhost:8080
```

## O que tem

| Aba | O que faz |
| --- | --- |
| **Criar look** | Sua imagem + referência → copia a cor da referência (transferência em Lab: tons por histograma, cor por sombras/médios/realces). Ou escolha um dos 16 looks prontos. |
| Modo **Simplificado** | Luz/cor da referência, intensidade, exposição, contraste, realces, sombras, temperatura, matiz, saturação, vibração, fade. |
| Modo **Profissional** | + split toning, HSL por cor (8 cores), curvas RGB/R/G/B, histograma. |
| **Exportar** | LUT `.cube` 33³, preset `.xmp` e a imagem editada em `.jpg`. |
| **Clonar LUT** | Antes + depois do mesmo frame → LUT ajustável. |
| **Converter** | `.cube` → preset `.xmp` e preset `.xmp`/`.dng` → `.cube`, vários arquivos de uma vez. |
| **Aspect ratio** | Resolução para cada proporção e tamanho das barras (letterbox) dentro do frame. |

## Arquivos

- `colormath.js`: motor de cor (Lab, transferência, pipeline de ajustes, LUT 3D, clonagem, leitura/escrita de `.cube` e `.xmp`).
- `looks.js`: os 16 looks prontos (só parâmetros).
- `app.js`: interface.

## Limitações conhecidas

- Preset do Lightroom não guarda LUT 3D. Por isso o `.xmp` é uma aproximação: curvas RGB tiradas do eixo neutro da LUT, mais saturação e HSL medidos. Tons e tonalização ficam fiéis; cores muito específicas podem variar.
- A conversão `.xmp` → `.cube` lê exposição, contraste, realces/sombras, temperatura/matiz incrementais, saturação/vibração, HSL, color grading/split toning e curvas. Ajustes locais, máscaras e perfis de câmera não entram.
