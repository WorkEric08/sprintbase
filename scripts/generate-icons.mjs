// Gera os ícones e splashes a partir do desenho de public/icon.svg (gradiente roxo + raio).
//
//   node scripts/generate-icons.mjs
//
// Saídas:
//   public/icons/*.png         ícones do PWA (192, 512, maskable, apple-touch)
//   assets/*.png               fontes do @capacitor/assets (ícone adaptativo e splashes)
// Depois, para gerar os recursos do Android:  npx capacitor-assets generate --android
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (p) => root + p;
mkdirSync(out('public/icons'), { recursive: true });
mkdirSync(out('assets'), { recursive: true });

const BOLT = 'M300 60L140 290H230L200 450L370 190H280L310 60Z'; // mesmo raio do icon.svg (centro ≈ 255,255)
const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>
  </defs>`;

/** Raio centralizado numa tela `size`, ocupando `scale` vezes o tamanho original (512). */
const bolt = (size, scale) =>
  `<path d="${BOLT}" fill="white" transform="translate(${size / 2} ${size / 2}) scale(${scale}) translate(-255 -255)"/>`;

const svg = (size, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`);

const png = (buf, file, size) => sharp(buf, { density: 384 }).resize(size, size).png().toFile(out(file));

// Ícone "normal": quadrado arredondado com o raio (igual ao icon.svg).
const rounded = (size) =>
  svg(size, `${GRADIENT}<rect width="${size}" height="${size}" rx="${size * 0.234}" fill="url(#g)"/>${bolt(size, size / 512)}`);
// Ícone de sangria total (sem cantos): a plataforma aplica a máscara. O raio fica na zona segura.
const fullBleed = (size, scale) => svg(size, `${GRADIENT}<rect width="${size}" height="${size}" fill="url(#g)"/>${bolt(size, scale)}`);

// ── PWA ──
await png(rounded(512), 'public/icons/icon-512.png', 512);
await png(rounded(512), 'public/icons/icon-192.png', 192);
await png(fullBleed(512, 0.82), 'public/icons/maskable-512.png', 512); // raio dentro dos 80% centrais
await png(fullBleed(512, 0.82), 'public/icons/apple-touch-icon.png', 180);

// ── Android (ícone adaptativo: 108dp, zona segura = 66% central) ──
await png(rounded(1024), 'assets/icon-only.png', 1024);
await png(svg(1024, bolt(1024, 1.4)), 'assets/icon-foreground.png', 1024);
await png(svg(1024, `${GRADIENT}<rect width="1024" height="1024" fill="url(#g)"/>`), 'assets/icon-background.png', 1024);

// ── Splash (clara e escura): ícone centralizado sobre a cor de fundo do tema ──
const splash = (bg) => {
  const size = 2732;
  const icon = 560;
  const pos = (size - icon) / 2;
  return svg(size, `${GRADIENT}<rect width="${size}" height="${size}" fill="${bg}"/>
    <g transform="translate(${pos} ${pos})">
      <rect width="${icon}" height="${icon}" rx="${icon * 0.234}" fill="url(#g)"/>
      ${bolt(icon, icon / 512)}
    </g>`);
};
await png(splash('#f9fafb'), 'assets/splash.png', 2732);
await png(splash('#030712'), 'assets/splash-dark.png', 2732);

console.log('Ícones e splashes gerados em public/icons e assets.');
