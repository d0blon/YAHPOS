function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  }
}

function relativeLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getContrastRatio(hex1: string, hex2: string) {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  const l1 = relativeLuminance(c1.r, c1.g, c1.b)
  const l2 = relativeLuminance(c2.r, c2.g, c2.b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsAA(ratio: number, large: boolean = false) {
  return large ? ratio >= 3 : ratio >= 4.5
}

export function meetsAAA(ratio: number, large: boolean = false) {
  return large ? ratio >= 4.5 : ratio >= 7
}

export function getContrastRating(ratio: number): 'fail' | 'AA-large' | 'AA' | 'AAA' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA-large'
  return 'fail'
}

export function getTextColorForBg(bgHex: string) {
  const ratioWhite = getContrastRatio(bgHex, '#ffffff')
  const ratioBlack = getContrastRatio(bgHex, '#000000')
  return ratioWhite > ratioBlack ? '#ffffff' : '#000000'
}

export function findAccessibleColors(
  targetHex: string,
  candidates: string[],
  largeText: boolean = false
): { hex: string; ratio: number; passes: boolean }[] {
  return candidates.map(hex => ({
    hex,
    ratio: getContrastRatio(targetHex, hex),
    passes: meetsAA(getContrastRatio(targetHex, hex), largeText),
  })).sort((a, b) => b.ratio - a.ratio)
}
