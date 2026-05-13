import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

const FALLBACK_API_URL = 'http://localhost:4000';

interface RuntimeConfig {
  apiUrl?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Reads `window.__APP_CONFIG__.apiUrl` set by `public/config.js` at runtime.
 * That file ships with sane defaults but can be edited per-environment
 * without rebuilding the Angular bundle (handy for Docker, Vercel, Render…).
 *
 * Falls back to localhost:4000 if config.js never loaded — common in unit
 * tests and SSR-like environments.
 */
export const resolveApiConfig = (): ApiConfig => {
  const fromWindow =
    typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;
  const apiUrl = fromWindow?.apiUrl?.trim();
  return {
    baseUrl: apiUrl && apiUrl.length > 0 ? apiUrl.replace(/\/$/, '') : FALLBACK_API_URL,
  };
};

export const defaultApiConfig: ApiConfig = resolveApiConfig();
