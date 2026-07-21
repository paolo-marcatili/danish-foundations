/**
 * Resolve a file from Vite's public directory against the configured base URL.
 *
 * Local development and Capacitor builds use `/`, while GitHub Pages uses the
 * repository subdirectory (for example `/hero-language-camp/`). External,
 * data, blob, and browser-TTS URLs are returned unchanged.
 */
export function publicUrl(path: string): string {
  const value = path.trim();
  if (!value) return import.meta.env.BASE_URL;

  if (
    /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)
  ) {
    return value;
  }

  const baseUrl = ensureTrailingSlash(import.meta.env.BASE_URL || "/");
  if (value.startsWith(baseUrl)) return value;

  return `${baseUrl}${value.replace(/^\/+/, "")}`;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
