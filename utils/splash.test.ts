import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A abertura do Android (a do sistema) é só um fundo liso preto, sem logo: o logo animado é da página (index.html).
 * Estes testes impedem que uma imagem de abertura volte sem querer (por exemplo, ao regerar os assets) e que a cor
 * do sistema deixe de ser a da abertura animada (senão aparece uma emenda na troca).
 */
const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf-8');
const res = 'android/app/src/main/res';

const walk = (dir: URL): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir).pathname]);

describe('abertura (splash) sem logo', () => {
  it('o fundo da abertura é preto nos dois temas, como o da animação (index.html) e o do manifest', () => {
    expect(read(`${res}/values/sprint_colors.xml`)).toContain('<color name="sprint_splash_background">#000000</color>');
    expect(read(`${res}/values-night/sprint_colors.xml`)).not.toContain('sprint_splash_background'); // herda o preto
    expect(read('index.html')).toMatch(/#abertura \{[^}]*background: #000;/);
    expect(read('capacitor.config.ts')).toContain("backgroundColor: '#000000'");
  });

  it('o tema de abertura usa o fundo preto e um ícone transparente', () => {
    const styles = read(`${res}/values/styles.xml`);
    const launch = styles.match(/<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/)?.[0] ?? '';
    expect(launch).toContain('name="windowSplashScreenBackground">@color/sprint_splash_background');
    expect(launch).toContain('name="windowSplashScreenAnimatedIcon">@drawable/sprint_splash_icon');
    expect(launch).toContain('name="android:background">@color/sprint_splash_background');
  });

  it('o ícone de abertura é totalmente transparente', () => {
    const icon = read(`${res}/drawable/sprint_splash_icon.xml`);
    expect(icon).toContain('android:fillColor="#00000000"');
  });

  it('o drawable "splash" (Android 11 e anteriores) é só o fundo preto da abertura', () => {
    expect(read(`${res}/values/sprint_colors.xml`)).toMatch(/<drawable name="splash">@color\/sprint_splash_background<\/drawable>/);
  });

  it('não há nenhuma imagem de abertura nos recursos do Android', () => {
    const images = walk(new URL(`${res}/`, root)).filter(p => /\/splash[^/]*\.(png|jpg|webp)$/i.test(p));
    expect(images).toEqual([]);
  });

  it('não há imagem de origem de splash nem script que a gere', () => {
    expect(existsSync(new URL('assets/splash.png', root))).toBe(false);
    expect(existsSync(new URL('assets/splash-dark.png', root))).toBe(false);
    // procura uma CHAMADA que gere o arquivo (o comentário que explica a ausência não conta)
    expect(read('scripts/generate-icons.mjs')).not.toMatch(/png\([^\n]*assets\/splash/);
  });

  it('a cor da abertura não é fixada no Capacitor (senão ignora o modo escuro)', () => {
    const cfg = read('capacitor.config.ts');
    const splashBlock = cfg.match(/SplashScreen: \{[\s\S]*?\n    \},/)?.[0] ?? '';
    expect(splashBlock).not.toMatch(/backgroundColor/);
    expect(splashBlock).toContain('launchAutoHide: false'); // sai no primeiro quadro da página (index.html) e, no limite, em utils/native.ts
  });
});
