/**
 * Texto colorido legível. As cores das matérias (e o verde/vermelho/âmbar dos resultados) servem bem como fundo ou
 * barra, mas como TEXTO muitas reprovam no contraste mínimo (4,5:1): o âmbar sobre branco tem 2,1:1, o índigo sobre
 * preto 4,0:1. Em vez de trocar a cor de cada matéria (que é escolha da pessoa), o texto usa a mesma cor misturada com
 * preto no tema claro e com um pouco de branco no escuro (variável `--legible-mix`, em index.css).
 *
 * Use em `style={{ color: legible(cor) }}` quando a cor vier de dados; em classes fixas do Tailwind, escolha o tom
 * certo para cada tema (ex.: `text-green-700 dark:text-green-400`).
 */
export function legible(color: string): string;
export function legible(color: undefined): undefined;
export function legible(color: string | undefined): string | undefined;
export function legible(color: string | undefined): string | undefined {
  return color ? `color-mix(in srgb, ${color}, var(--legible-mix, black 35%))` : undefined;
}
