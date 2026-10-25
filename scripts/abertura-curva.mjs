// Calcula os números da animação de abertura (index.html) a partir da curva de ease do desenho do contorno.
//
//   node scripts/abertura-curva.mjs
//
// O contorno é um anel desenhado por duas metades que giram (só `transform`, que o navegador anima na placa de
// vídeo, sem a thread principal). Para a curva global do desenho (começa e termina devagar, meio rápido) valer
// para o anel inteiro, a curva é cortada ao meio com o algoritmo de De Casteljau: cada metade ganha a sua
// `cubic-bezier` (exata, não aproximada) e o atraso e a duração da sua parte do tempo total.
// Rode de novo se mudar DESENHO_MS ou a curva, e copie os valores para o CSS do index.html.
const DESENHO_MS = 800;
const CURVA = [0.65, 0, 0.35, 1];

// Pontos de controle da cúbica de Bézier em (tempo, progresso): P0=(0,0), P1, P2, P3=(1,1).
const P = [[0, 0], [CURVA[0], CURVA[1]], [CURVA[2], CURVA[3]], [1, 1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Corta a cúbica em `u` (De Casteljau): devolve os pontos de controle das duas partes. */
function cortar(p, u) {
  const q0 = lerp(p[0], p[1], u), q1 = lerp(p[1], p[2], u), q2 = lerp(p[2], p[3], u);
  const r0 = lerp(q0, q1, u), r1 = lerp(q1, q2, u);
  const s = lerp(r0, r1, u);
  return [[p[0], q0, r0, s], [s, r1, q2, p[3]]];
}

/** Reescala uma parte para o quadrado 0..1 e devolve a `cubic-bezier(x1, y1, x2, y2)` equivalente. */
function normalizar(parte) {
  const [x0, y0] = parte[0];
  const [x3, y3] = parte[3];
  const f = ([x, y]) => [(x - x0) / (x3 - x0), (y - y0) / (y3 - y0)];
  const [a, b] = [f(parte[1]), f(parte[2])];
  return `cubic-bezier(${[a[0], a[1], b[0], b[1]].map(n => +n.toFixed(4)).join(', ')})`;
}

/** Instante (0..1 do desenho) em que a curva chega a `progresso`, por bisseção. */
function instanteDo(progresso) {
  const ponto = u => {
    const m = 1 - u;
    const c = i => 3 * m * m * u * P[1][i] + 3 * m * u * u * P[2][i] + u * u * u * P[3][i];
    return [c(0), c(1)];
  };
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (ponto(mid)[1] < progresso) lo = mid; else hi = mid;
  }
  return ponto((lo + hi) / 2)[0];
}

const [primeira, segunda] = cortar(P, 0.5);
const meio = primeira[3][0]; // instante (0..1) em que o desenho passa da metade
console.log(`Desenho de ${DESENHO_MS} ms, curva cubic-bezier(${CURVA.join(', ')})`);
console.log(`metade 1: atraso 0 ms, duração ${Math.round(meio * DESENHO_MS)} ms, ${normalizar(primeira)}`);
console.log(`metade 2: atraso ${Math.round(meio * DESENHO_MS)} ms, duração ${Math.round((1 - meio) * DESENHO_MS)} ms, ${normalizar(segunda)}`);
console.log('instante em que o ponteiro passa por cada ângulo:');
for (const graus of [45, 90, 180, 270, 315, 360]) {
  console.log(`  ${String(graus).padStart(3)}°: ${Math.round(instanteDo(graus / 360) * DESENHO_MS)} ms`);
}
