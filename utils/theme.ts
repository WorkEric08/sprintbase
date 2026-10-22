/**
 * Cor de fundo do app em cada tema. É a mesma do `gray-50` (claro) e do `gray-950` (escuro) do
 * Tailwind, e também a das barras do sistema no Android (plugin SystemBarColors), do
 * `theme-color` do navegador e do script de tema do index.html.
 *
 * Se mudar aqui, mude também: SystemBarColorsPlugin.java, os dois sprint_colors.xml (pastas values e
 * values-night), o index.html e o manifest do PWA (vite.config.ts). O teste utils/theme.test.ts
 * confere que continuam iguais.
 */
export type ThemeName = 'light' | 'dark';

export const THEME_BACKGROUND: Record<ThemeName, string> = {
  light: '#f9fafb',
  dark: '#030712',
};
