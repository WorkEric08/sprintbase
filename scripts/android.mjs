// Atalhos para o APK. Uso:  node scripts/android.mjs <comando>   (ou npm run android:<comando>)
//
//   sync      build do web (--mode android) + `cap sync` (WebView inspecionável)
//   build     sync + compila o APK de debug
//   install   instala o APK de debug no aparelho/emulador conectado (mantém os dados)
//   run       build + install + abre o app
//   open      só abre o app já instalado
//   devices   lista aparelhos/emuladores
//
// Descobre sozinho o JDK e o SDK instalados na pasta do usuário, para funcionar mesmo num terminal
// aberto antes de JAVA_HOME / ANDROID_HOME serem definidos.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const androidDir = join(root, 'android');
const APP_ID = 'com.workeric08.sprint';
const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const isWin = process.platform === 'win32';

function findJdk() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const base = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Programs', 'jdk21');
  if (existsSync(base)) {
    const dir = readdirSync(base).find(d => d.startsWith('jdk-'));
    if (dir) return join(base, dir);
  }
  return undefined;
}

function findSdk() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const guess = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk');
  return existsSync(guess) ? guess : undefined;
}

const jdk = findJdk();
const sdk = findSdk();
const env = { ...process.env };
if (jdk) env.JAVA_HOME = jdk;
if (sdk) { env.ANDROID_HOME = sdk; env.ANDROID_SDK_ROOT = sdk; }
const adb = sdk ? join(sdk, 'platform-tools', isWin ? 'adb.exe' : 'adb') : 'adb';

function run(cmd, args, opts = {}) {
  // No Windows, .bat/.cmd e npx só rodam por um shell, que não junta aspas sozinho:
  // o caminho do projeto tem espaço ("Sprint Base"), então o executável vai entre aspas.
  const useShell = isWin && /\.(bat|cmd)$|^npx$|^npm$/i.test(cmd);
  const file = useShell && /\s/.test(cmd) ? `"${cmd}"` : cmd;
  const r = spawnSync(file, args, { stdio: 'inherit', env: { ...env, ...opts.env }, cwd: opts.cwd ?? root, shell: useShell });
  if (r.status !== 0) {
    console.error(`\nFalhou: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

function needToolchain() {
  if (!jdk) { console.error('JDK não encontrado. Defina JAVA_HOME (JDK 21).'); process.exit(1); }
  if (!sdk) { console.error('Android SDK não encontrado. Defina ANDROID_HOME.'); process.exit(1); }
}

const commands = {
  sync() {
    // SPRINT_WEBVIEW_DEBUG é lido por capacitor.config.ts: liga a inspeção remota (testes e chrome://inspect).
    run('npx', ['vite', 'build', '--mode', 'android']);
    run('npx', ['cap', 'sync', 'android'], { env: { SPRINT_WEBVIEW_DEBUG: '1' } });
  },
  build() {
    needToolchain();
    commands.sync();
    run(join(androidDir, isWin ? 'gradlew.bat' : 'gradlew'), ['assembleDebug'], { cwd: androidDir });
    console.log(`\nAPK de debug: ${apk}`);
  },
  install() {
    needToolchain();
    if (!existsSync(apk)) { console.error('APK não encontrado. Rode "build" antes.'); process.exit(1); }
    run(adb, ['install', '-r', apk]);
  },
  open() {
    run(adb, ['shell', 'am', 'start', '-n', `${APP_ID}/.MainActivity`]);
  },
  run() {
    commands.build();
    commands.install();
    commands.open();
  },
  devices() {
    run(adb, ['devices', '-l']);
  },
};

const cmd = process.argv[2];
if (!cmd || !commands[cmd]) {
  console.error(`Uso: node scripts/android.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}
commands[cmd]();
