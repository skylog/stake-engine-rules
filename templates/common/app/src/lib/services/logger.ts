/**
 * Game logger with on/off config.
 *
 * Enable via URL param `?debug=true` or by setting `window.__DEBUG = true` in console.
 * In production builds, all logs are silenced by default.
 */

function isEnabled(): boolean {
  try {
    if ((globalThis as any).__DEBUG) return true;
    if (typeof location !== 'undefined') {
      return new URLSearchParams(location.search).get('debug') === 'true';
    }
  } catch { /* SSR / test env */ }
  return false;
}

let _enabled: boolean | null = null;

function enabled(): boolean {
  if (_enabled === null) _enabled = isEnabled();
  return _enabled;
}

export const log = {
  info: (...args: unknown[]) => { if (enabled()) console.info(...args); },
  warn: (...args: unknown[]) => { if (enabled()) console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
  setEnabled: (v: boolean) => { _enabled = v; },
};
