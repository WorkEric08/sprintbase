// Atalhos para o APK. Uso:  node scripts/android.mjs <comando>   (ou npm run android:<comando>)
//
//   sync      build do web (--mode android) + `cap sync` (WebView inspecionável)
//   build     sync + compila o APK de debug (id com.workeric08.sprint.debug)
//   install   instala o APK de debug no aparelho/emulador conectado (mantém os dados)
//   run       build + install + abre o app
//   open      só abre o app já instalado
//   devices   lista aparelhos/emuladores
//   release   APK ASSINADO para distribuir: release/Sprint.apk (+ .sha256), sem inspeção do WebView
//   install-release   instala release/Sprint.apk no aparelho conectado
//
// O APK de debug e o de release têm ids e assinaturas diferentes, então convivem no mesmo aparelho.
// A chave de assinatura fica fora do repositório, em ~/.sprint-signing (ver LEIA-ME.txt lá).
//
// Descobre sozinho o JDK e o SDK instalados na pasta do usuário, para funcionar mesmo num terminal
// aberto antes de JAVA_HOME / ANDROID_HOME serem definidos.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const androidDir = join(root, 'android');
const APP_ID = 'com.workeric08.sprint.debug'; // id do build de debug (o de release é com.workeric08.sprint)
const apk = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const releaseApkBuilt = join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const releaseDir = join(root, 'release');
const releaseApk = join(releaseDir, 'Sprint.apk');
const signingProps = join(homedir(), '.sprint-signing', 'keystore.properties');
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

/** Executa e devolve a saída (sem despejar na tela). */
function capture(cmd, args) {
  const useShell = isWin && /\.(bat|cmd)$/i.test(cmd);
  const file = useShell && /\s/.test(cmd) ? `"${cmd}"` : cmd;
  // Por um shell os argumentos não ganham aspas sozinhos (o caminho do projeto tem espaço).
  const safeArgs = useShell ? args.map(a => (/\s/.test(a) ? `"${a}"` : a)) : args;
  const r = spawnSync(file, safeArgs, { encoding: 'utf-8', env, shell: useShell });
  return { status: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Confere o APK de release: assinado, com o id e a versão certos e sem ser "debuggable". */
function verifyRelease(file) {
  const tools = join(sdk, 'build-tools');
  const latest = readdirSync(tools).sort().at(-1);
  const signer = capture(join(tools, latest, isWin ? 'apksigner.bat' : 'apksigner'), ['verify', '--verbose', '--print-certs', file]);
  if (signer.status !== 0 || !/Verifies/.test(signer.out)) {
    console.error(`Assinatura inválida:\n${signer.out}`);
    process.exit(1);
  }
  const certSha = signer.out.match(/certificate SHA-256 digest: ([0-9a-f]+)/i)?.[1] ?? '?';
  const badging = capture(join(tools, latest, isWin ? 'aapt.exe' : 'aapt'), ['dump', 'badging', file]).out;
  const pkg = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
  if (!pkg) { console.error('Não consegui ler o pacote do APK.'); process.exit(1); }
  if (pkg[1] !== 'com.workeric08.sprint') { console.error(`Id inesperado no APK de release: ${pkg[1]}`); process.exit(1); }
  if (/application-debuggable/.test(badging)) { console.error('O APK de release está marcado como debuggable.'); process.exit(1); }
  console.log(`\n✓ assinatura válida (esquemas: ${(signer.out.match(/Verified using (v\d(?:\.\d)?) scheme[^:]*: true/g) ?? []).map(s => s.split(' ')[2]).join(', ')})`);
  console.log(`✓ id ${pkg[1]} · versão ${pkg[3]} (código ${pkg[2]}) · não é debuggable`);
  console.log(`  certificado SHA-256: ${certSha}`);
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
  release() {
    needToolchain();
    if (!existsSync(signingProps)) {
      console.error(`Chave de assinatura não encontrada em ${signingProps}.\nSem ela o APK sairia sem assinatura e não instalaria por cima de versões futuras.`);
      process.exit(1);
    }
    // Sem SPRINT_WEBVIEW_DEBUG: o WebView do release não pode ser inspecionado.
    run('npx', ['vite', 'build', '--mode', 'android']);
    run('npx', ['cap', 'sync', 'android'], { env: { SPRINT_WEBVIEW_DEBUG: '' } });
    run(join(androidDir, isWin ? 'gradlew.bat' : 'gradlew'), ['assembleRelease'], { cwd: androidDir });
    if (!existsSync(releaseApkBuilt)) { console.error('APK de release não foi gerado.'); process.exit(1); }
    verifyRelease(releaseApkBuilt);
    mkdirSync(releaseDir, { recursive: true });
    copyFileSync(releaseApkBuilt, releaseApk);
    const hash = sha256(releaseApk);
    writeFileSync(`${releaseApk}.sha256`, `${hash}  Sprint.apk\n`);
    console.log(`  APK SHA-256: ${hash}`);
    console.log(`\nPronto: ${releaseApk}`);
  },
  'install-release'() {
    needToolchain();
    if (!existsSync(releaseApk)) { console.error('release/Sprint.apk não existe. Rode "release" antes.'); process.exit(1); }
    run(adb, ['install', '-r', releaseApk]);
  },
};

const cmd = process.argv[2];
if (!cmd || !commands[cmd]) {
  console.error(`Uso: node scripts/android.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}
commands[cmd]();
