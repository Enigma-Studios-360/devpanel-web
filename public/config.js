/* DevPanel — Runtime configuration
 *
 * This file is loaded BEFORE Angular bootstraps and lets you change the
 * backend URL without rebuilding the frontend.
 *
 * In production, replace `apiUrl` with your real backend domain.
 * In development, point it at wherever you started the backend (default :4000).
 *
 * You can override the values per-environment by serving a different
 * config.js from the same path (e.g. via a Docker volume, S3 origin,
 * Vercel rewrites, etc.).
 */
window.__APP_CONFIG__ = {
  apiUrl: 'http://localhost:4000',
};
