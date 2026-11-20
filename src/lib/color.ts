export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16)
    g = parseInt(clean.substring(2, 4), 16)
    b = parseInt(clean.substring(4, 6), 16)
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0; const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generateShades(hex: string): Record<number, string> {
  const { h, s, l } = hexToHsl(hex)
  const shades: Record<number, string> = {}
  const lightnessMap: Record<number, number> = {
    50: 97, 100: 90, 200: 80, 300: 65,
    400: 50, 500: l,
    600: 35, 700: 25, 800: 15, 900: 8,
  }
  for (const [key, lightness] of Object.entries(lightnessMap)) {
    shades[Number(key)] = hslToHex(h, s, Math.max(0, Math.min(100, lightness)))
  }
  return shades
}

export function generateSurfaceShades(hex: string): Record<number, string> {
  const { h } = hexToHsl(hex)
  const shades: Record<number, string> = {}
  const s = 6
  const lightnessMap: Record<number, number> = {
    50: 98, 100: 100, 150: 93, 200: 85, 250: 75,
  }
  for (const [key, lightness] of Object.entries(lightnessMap)) {
    shades[Number(key)] = hslToHex(h, s, Math.max(0, Math.min(100, lightness)))
  }
  return shades
}
