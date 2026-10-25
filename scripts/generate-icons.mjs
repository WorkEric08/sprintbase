// Gera os ícones a partir do desenho de public/icon.svg (cronômetro roxo com visto, sobre fundo preto).
//
//   node scripts/generate-icons.mjs
//
// Saídas:
//   public/icons/*.png         ícones do PWA (192, 512, maskable, apple-touch)
//   assets/*.png               fontes do @capacitor/assets (ícone adaptativo do Android)
// Depois, para gerar os recursos do Android:  npx capacitor-assets generate --android
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (p) => root + p;
mkdirSync(out('public/icons'), { recursive: true });
mkdirSync(out('assets'), { recursive: true });

const ICON = readFileSync(out('public/icon.svg'), 'utf-8'); // 1024 × 1024, fundo preto + logo
const FUNDO = '<rect width="1024" height="1024" fill="#000"/>';
if (!ICON.includes(FUNDO)) throw new Error('public/icon.svg mudou: ajuste FUNDO em scripts/generate-icons.mjs');
const LOGO = ICON.replace(FUNDO, '').replace(/^<svg[^>]*>|<\/svg>\s*$/g, ''); // só o desenho, sem fundo

const svg = (body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none">${body}</svg>`);
const png = (buf, file, size) => sharp(buf, { density: 384 }).resize(size, size).png().toFile(out(file));

/** O ícone completo (fundo preto + logo) com o logo `zoom` vezes maior, ampliado a partir do centro. */
const ampliado = (zoom) => svg(`${FUNDO}<g transform="translate(512 512) scale(${zoom}) translate(-512 -512)">${LOGO}</g>`);

// ── PWA ──
// O logo (public/icon.svg, o oficial) ocupa 58% × 70% do quadrado; nos ícones abaixo ele é ampliado para ficar maior
// na tela inicial. A "maskable" tem zona segura de 80% (círculo de raio 410): o canto da barra do topo está a 383 do
// centro, então ali o limite é 1,07.
const ZOOM_PWA = 1.12;
const ZOOM_MASKABLE = 1.05;
await png(ampliado(ZOOM_PWA), 'public/icons/icon-512.png', 512);
await png(ampliado(ZOOM_PWA), 'public/icons/icon-192.png', 192);
await png(ampliado(ZOOM_MASKABLE), 'public/icons/maskable-512.png', 512);
await png(ampliado(ZOOM_PWA), 'public/icons/apple-touch-icon.png', 180);

// ── Android (ícone adaptativo: 108dp, zona segura = círculo de 66% no centro, raio 338) ──
// 0,92 deixa só a quina da barra do topo (a 383 do centro) um pouco além do círculo; o anel e o visto ficam inteiros.
const ZOOM_ADAPTATIVO = 0.92;
await png(ampliado(ZOOM_PWA), 'assets/icon-only.png', 1024); // ícones antigos (quadrado e redondo)
await png(svg(`<g transform="translate(512 512) scale(${ZOOM_ADAPTATIVO}) translate(-512 -512)">${LOGO}</g>`), 'assets/icon-foreground.png', 1024);
await png(svg(FUNDO), 'assets/icon-background.png', 1024);

// Não há imagem de abertura (splash) de propósito: o app abre direto na tela inicial, e a abertura do Android é só
// um fundo liso preto (res/values/styles.xml, sprint_colors.xml); a animação do logo é do index.html.
// Por isso não existem assets/splash*.png.

console.log('Ícones gerados em public/icons e assets.');
