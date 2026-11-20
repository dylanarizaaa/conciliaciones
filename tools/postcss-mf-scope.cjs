// @ts-check
/**
 * Plugin de PostCSS: encierra la hoja global del micro front en un ámbito (`.mf-reportes`).
 *
 * El orquestador carga esta hoja de forma global. Sin ámbito, sus variables (`:root`), el reset de
 * Tailwind y sus utilidades le pisan los estilos al portal (y el portal se cuela en el micro front).
 * Con el ámbito:
 *
 * - `:root`, `:host`, `html` y `body` pasan a ser el propio ámbito (variables y estilos base solo
 *   dentro del micro front). Lo de `body` (fondo y color de texto) no se aplica al contenedor de
 *   overlays, que también lleva la clase y debe seguir transparente sobre el portal.
 * - Cualquier otro selector queda dentro del ámbito: `.flex` → `.mf-reportes .flex`. Además suma
 *   una clase de especificidad, así sus reglas le ganan a las del portal dentro del micro front.
 * - Las reglas estructurales de los overlays de CDK (`.cdk-*`) se dejan globales: son las mismas en
 *   el portal y el contenedor de overlays del micro front ya lleva la clase del ámbito.
 * - `@font-face`, `@keyframes` y `@property` no tienen selectores y siguen siendo globales.
 *
 * Solo transforma los archivos indicados en `files` (la hoja global), no los estilos de componentes.
 *
 * @param {{ scope: string; files: string[] }} options
 * @returns {import('postcss').Plugin}
 */
function mfScope(options) {
  const { scope, files } = options;
  if (!scope || !Array.isArray(files) || files.length === 0) {
    throw new Error('postcss-mf-scope: indica `scope` (p. ej. ".mf-reportes") y `files`.');
  }

  return {
    postcssPlugin: 'postcss-mf-scope',
    Once(root, { result }) {
      const from = (result.opts.from ?? '').replaceAll('\\', '/');
      if (!files.some((file) => from.endsWith(file))) return;

      root.walkRules((rule) => {
        // Pasos de @keyframes (`from`, `50%`) y reglas anidadas: su selector ya depende del padre.
        if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name ?? '')) return;
        if (hasRuleAncestor(rule)) return;
        rule.selectors = rule.selectors.map((selector) => scopeSelector(selector, scope));
      });
    },
  };
}
mfScope.postcss = true;

/** `&` de anidamiento (sin escapar: `[&_th]:…` lleva `\&` dentro del nombre de la clase). */
const NESTING = /(^|[^\\])&/;

/** `:root`, `:host`, `html` y `body` al inicio del selector (solos o con más condiciones). */
const ROOT_SELECTOR = /^(?::root|:host|html|body)(?=$|[.:[\s>+~])/;
const BODY_SELECTOR = /^body(?=$|[.:[\s>+~])/;

/**
 * @param {string} selector
 * @param {string} scope
 */
function scopeSelector(selector, scope) {
  const trimmed = selector.trim();
  if (trimmed.startsWith('.cdk-') || NESTING.test(trimmed)) return trimmed;
  if (BODY_SELECTOR.test(trimmed)) {
    return trimmed.replace(BODY_SELECTOR, `${scope}:not(.cdk-overlay-container)`);
  }
  if (ROOT_SELECTOR.test(trimmed)) return trimmed.replace(ROOT_SELECTOR, scope);
  return `${scope} ${trimmed}`;
}

/** @param {import('postcss').Rule} rule */
function hasRuleAncestor(rule) {
  for (let node = rule.parent; node; node = node.parent) {
    if (node.type === 'rule') return true;
  }
  return false;
}

module.exports = mfScope;
module.exports.scopeSelector = scopeSelector;
