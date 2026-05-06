export type AccentTheme = {
  fill: string;
  progress: string;
  progressTrack: string;
  bottomGradient: string;
  sheetBackdrop: string;
  softBorder: string;
  softBorderHover: string;
  ghostActiveBg: string;
  ghostActiveText: string;
  mixCardBorder: string;
  mixCardBg: string;
  mixCardLabel: string;
  mixCardCta: string;
  miniShadow: string;
};

const DEFAULT = { r: 129, g: 140, b: 248 };

function clamp255(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: clamp255(a.r + (b.r - a.r) * t),
    g: clamp255(a.g + (b.g - a.g) * t),
    b: clamp255(a.b + (b.b - a.b) * t)
  };
}

function srgbChannelToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const R = srgbChannelToLinear(rgb.r);
  const G = srgbChannelToLinear(rgb.g);
  const B = srgbChannelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function clampAccentRgb(rgb: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  let x = { ...rgb };
  const chroma = Math.max(x.r, x.g, x.b) - Math.min(x.r, x.g, x.b);
  if (chroma < 22) {
    x = mixRgb(x, DEFAULT, 0.55);
  }
  for (let i = 0; i < 16; i++) {
    const L = relativeLuminance(x);
    if (L >= 0.26 && L <= 0.68) break;
    if (L < 0.26) x = mixRgb(x, { r: 255, g: 255, b: 255 }, 0.2);
    else x = mixRgb(x, { r: 0, g: 0, b: 0 }, 0.2);
  }
  return {
    r: clamp255(x.r),
    g: clamp255(x.g),
    b: clamp255(x.b)
  };
}

export function parseCssRgb(input: string | null): { r: number; g: number; b: number } | null {
  if (!input || !input.trim()) return null;
  const m = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  const hex = input.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!hex) return null;
  let h = hex[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function accentTheme(accent: string | null): AccentTheme {
  const parsed = parseCssRgb(accent) ?? DEFAULT;
  const base = clampAccentRgb(parsed);
  const { r, g, b } = base;
  const fill = `rgb(${r},${g},${b})`;
  const dim = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.35);
  const progress = `rgba(${r},${g},${b},0.92)`;
  const progressTrack = `rgba(${r},${g},${b},0.22)`;
  const bottomGradient = [
    `linear-gradient(180deg, transparent 0%, transparent 38%, rgba(${r},${g},${b},0.05) 65%, rgba(${r},${g},${b},0.14) 100%)`,
    `radial-gradient(95% 55% at 50% 100%, rgba(${r},${g},${b},0.16) 0%, transparent 72%)`
  ].join(", ");
  const sheetBackdrop = `rgba(9,9,11,0.72)`;
  const softBorder = `rgba(${r},${g},${b},0.28)`;
  const softBorderHover = `rgba(${r},${g},${b},0.42)`;
  const ghostActiveBg = `rgba(${r},${g},${b},0.16)`;
  const lit = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.38);
  const ghostActiveText = `rgb(${lit.r},${lit.g},${lit.b})`;
  const mixCardBorder = `rgba(${r},${g},${b},0.32)`;
  const mixCardBg = `linear-gradient(135deg, rgba(${r},${g},${b},0.14) 0%, rgba(9,9,11,0.92) 55%, rgb(9,9,11) 100%)`;
  const mixLabel = `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},0.95)`;
  const mixCta = `rgba(${Math.min(255, r + 55)},${Math.min(255, g + 55)},${Math.min(255, b + 55)},0.92)`;
  const miniShadow = `0 0 48px -10px rgba(${dim.r},${dim.g},${dim.b},0.45)`;
  return {
    fill,
    progress,
    progressTrack,
    bottomGradient,
    sheetBackdrop,
    softBorder,
    softBorderHover,
    ghostActiveBg,
    ghostActiveText,
    mixCardBorder,
    mixCardBg,
    mixCardLabel: mixLabel,
    mixCardCta: mixCta,
    miniShadow
  };
}
