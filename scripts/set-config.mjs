/* Escribe public/config.js con la URL del API tomada de la env var API_URL.
 * Se corre ANTES de `ng build` en Vercel (ver vercel.json). En local no se usa:
 * config.js queda con localhost:4000 por defecto. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const apiUrl = process.env['API_URL'];
if (!apiUrl) {
  console.log('[set-config] API_URL no definida — se conserva public/config.js actual (localhost)');
  process.exit(0);
}
if (!/^https?:\/\/[^\s]+$/.test(apiUrl)) {
  console.error(`[set-config] API_URL inválida: ${apiUrl}`);
  process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'public', 'config.js');
const content = `/* Generado por scripts/set-config.mjs en el build de producción. */
window.__APP_CONFIG__ = {
  apiUrl: '${apiUrl}',
};
`;
writeFileSync(target, content);
console.log(`[set-config] public/config.js -> apiUrl=${apiUrl}`);
