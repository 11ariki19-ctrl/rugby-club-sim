let s = (Date.now() ^ 0x9e3779b9) >>> 0;

export function seed(n: number): void {
  s = n >>> 0;
}

export function rand(): number {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(a: number, b: number): number {
  return a + Math.floor(rand() * (b - a + 1));
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function gauss(m = 0, sd = 1): number {
  const u = 1 - rand();
  const v = rand();
  return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}
