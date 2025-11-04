import * as THREE from 'three';

/**
 * Normalize an SVG fill string to #RRGGBB uppercase hex.
 * - Returns null for gradients (url(#..)) or 'none' / empty.
 * - Accepts CSS color names, rgb(), rgba(), hsl(), hex short/long.
 */
export function normalizeColor(input?: string | null): string | null {
  const raw = (input || '').trim();
  if (!raw || raw.toLowerCase() === 'none') return null;
  if (raw.startsWith('url(')) return null; // gradients/patterns unsupported in this pass

  try {
    const color = new THREE.Color();
    // THREE.Color can parse many CSS strings
    color.set(raw as any);
    // Ensure full 6-digit hex in uppercase
    const hex = `#${color.getHexString().toUpperCase()}`;
    return hex;
  } catch {
    return null;
  }
}

/**
 * Extract normalized fill + opacity from SVG style/userData.style.
 * - If gradient or invalid color: returns null (caller may decide to skip or snap to palette).
 * - If rgba/hsla provided with alpha, alpha is mapped to 0..1 opacity.
 */
export function parseFill(
  style?: Partial<{ fill: string; fillOpacity: string | number; opacity: string | number }> | null
): { hex: string; opacity?: number } | null {
  if (!style) return null;

  const hex = normalizeColor(style.fill);
  if (!hex) return null;

  let op: number | undefined;
  const hasFillOpacity =
    typeof style.fillOpacity === 'number' ||
    (typeof style.fillOpacity === 'string' && style.fillOpacity.trim().length > 0);
  const hasOpacity =
    typeof style.opacity === 'number' ||
    (typeof style.opacity === 'string' && style.opacity.trim().length > 0);

  if (hasFillOpacity) {
    op =
      typeof style.fillOpacity === 'string'
        ? parseFloat(style.fillOpacity)
        : (style.fillOpacity as number);
  } else if (hasOpacity) {
    op = typeof style.opacity === 'string' ? parseFloat(style.opacity) : (style.opacity as number);
  }

  if (typeof op === 'number') {
    // clamp
    op = Math.max(0, Math.min(1, op));
  } else {
    op = undefined;
  }

  return { hex, opacity: op };
}
