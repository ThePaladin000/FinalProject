/**
 * Sanitize a potentially user-supplied URL for use in an anchor href.
 *
 * Allows only http(s), mailto, and tel schemes. Returns '#' for anything else.
 */
export function safeUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl) return '#';

  try {
    const trimmed = rawUrl.trim();

    // Allow relative URLs (beginning with '/' or './' or '../')
    if (/^(\/|\.\/|\.\.\/)/.test(trimmed)) {
      return trimmed;
    }

    // Parse absolute URLs and allowlist schemes
    const url = new URL(trimmed, 'http://example.com'); // base for relative parsing
    const scheme = (url.protocol || '').toLowerCase();

    if (scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:' || scheme === 'tel:') {
      return trimmed;
    }

    return '#';
  } catch {
    return '#';
  }
}


