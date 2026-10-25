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

// ── PWA ──
// O desenho já cabe na zona segura do ícone "maskable" (círculo de 80% no centro), então é o mesmo para todos.
await png(Buffer.from(ICON), 'public/icons/icon-512.png', 512);
await png(Buffer.from(ICON), 'public/icons/icon-192.png', 192);
await png(Buffer.from(ICON), 'public/icons/maskable-512.png', 512);
await png(Buffer.from(ICON), 'public/icons/apple-touch-icon.png', 180);

// ── Android (ícone adaptativo: 108dp, zona segura = círculo de 66% no centro) ──
const ZONA_SEGURA = 0.86; // reduz o desenho para a ponta da barra do topo ficar dentro do círculo
await png(Buffer.from(ICON), 'assets/icon-only.png', 1024);
await png(svg(`<g transform="translate(512 512) scale(${ZONA_SEGURA}) translate(-512 -512)">${LOGO}</g>`), 'assets/icon-foreground.png', 1024);
await png(svg(FUNDO), 'assets/icon-background.png', 1024);

// Não há imagem de abertura (splash) de propósito: o app abre direto na tela inicial, e a abertura do Android é só
// um fundo liso preto (res/values/styles.xml, sprint_colors.xml); a animação do logo é do index.html.
// Por isso não existem assets/splash*.png.

console.log('Ícones gerados em public/icons e assets.');
