import { styles, type StylesConfig } from '../config/styles.config.js';

/** `('colors', 'textMuted')` -> `--colors-text-muted`. */
export function toCssVarName(group: string, key: string): string {
  const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `--${group}-${kebab}`;
}

function unitFor(group: string, key: string): string {
  if (group === 'motion') return 'ms';
  if (group === 'typography' && key.startsWith('weight')) return '';
  return 'px';
}

/** Publica cada valor de la configuración como variable CSS en `root`. */
export function applyStyleTokens(
  config: StylesConfig = styles,
  root: HTMLElement = document.documentElement,
): void {
  for (const [group, values] of Object.entries(config)) {
    for (const [key, value] of Object.entries(values)) {
      const text = typeof value === 'number' ? `${value}${unitFor(group, key)}` : String(value);
      root.style.setProperty(toCssVarName(group, key), text);
    }
  }
}
