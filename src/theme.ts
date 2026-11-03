import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Fontes locais (public/fonts) — renderiza offline, sem depender do Google Fonts.
loadFont({family: 'Anton', url: staticFile('fonts/Anton-Regular.woff2'), weight: '400'});
loadFont({family: 'Inter', url: staticFile('fonts/Inter-Variable.woff2'), weight: '100 900'});

export const display = 'Anton, Impact, sans-serif';
export const body = 'Inter, Helvetica, Arial, sans-serif';

export const colors = {
  bg: '#0B0B0D',
  ink: '#F4F1EA',
  muted: '#8C8A85',
  accent: '#FF3B2F', // vermelho "REC"
  accent2: '#FFC94D',
};
