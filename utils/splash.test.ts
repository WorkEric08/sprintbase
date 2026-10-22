import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * O app abre direto na tela inicial: a abertura do Android é só um fundo liso da cor do app, sem logo.
 * Estes testes impedem que uma imagem de abertura volte sem querer (por exemplo, ao regerar os assets).
 */
const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf-8');
const res = 'android/app/src/main/res';

const walk = (dir: URL): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir).pathname]);

describe('abertura (splash) sem logo', () => {
  it('o tema de abertura usa o fundo do app e um ícone transparente', () => {
    const styles = read(`${res}/values/styles.xml`);
    const launch = styles.match(/<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/)?.[0] ?? '';
    expect(launch).toContain('name="windowSplashScreenBackground">@color/sprint_window_background');
    expect(launch).toContain('name="windowSplashScreenAnimatedIcon">@drawable/sprint_splash_icon');
    expect(launch).toContain('name="android:background">@color/sprint_window_background');
  });

  it('o ícone de abertura é totalmente transparente', () => {
    const icon = read(`${res}/drawable/sprint_splash_icon.xml`);
    expect(icon).toContain('android:fillColor="#00000000"');
  });

  it('o drawable "splash" (Android 11 e anteriores) é só a cor de fundo do app', () => {
    expect(read(`${res}/values/sprint_colors.xml`)).toMatch(/<drawable name="splash">@color\/sprint_window_background<\/drawable>/);
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
    expect(splashBlock).toContain('launchAutoHide: false'); // some quando a tela inicial carrega (utils/native.ts)
  });
});
