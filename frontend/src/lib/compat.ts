/**
 * Runtime shims for browsers older than the current baseline.
 *
 * Android 8.1 ships Chrome 64-70, which predates several APIs this app relies
 * on. Without these guards the calling code throws a TypeError, which the
 * surrounding try/catch swallows and the user just sees a generic failure.
 */

const HEX = "0123456789abcdef";

/** `crypto.randomUUID` (Chrome 92+). Falls back to a v4-shaped random id. */
export function randomId(): string {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }

  if (cryptoRef && typeof cryptoRef.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let out = "";
    for (let i = 0; i < 16; i += 1) {
      out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
      if (i === 3 || i === 5 || i === 7 || i === 9) out += "-";
    }
    return out;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return HEX[v];
  });
}

/** `Object.fromEntries` (Chrome 73+). */
export function fromEntries<T>(
  entries: Iterable<readonly [PropertyKey, T]>,
): Record<PropertyKey, T> {
  const obj = Object.create(null) as Record<PropertyKey, T>;
  for (const entry of entries) {
    obj[entry[0]] = entry[1];
  }
  return obj;
}

/** `Array.prototype.flatMap` (Chrome 69+). */
export function flatMap<T, U>(
  items: readonly T[],
  project: (item: T, index: number) => U | readonly U[],
): U[] {
  const out: U[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const mapped = project(items[i], i);
    if (Array.isArray(mapped)) {
      out.push(...(mapped as readonly U[]));
    } else {
      out.push(mapped as U);
    }
  }
  return out;
}

/** `String.prototype.replaceAll` (Chrome 85+). */
export function replaceAll(
  input: string,
  search: string | RegExp,
  replacement: string,
): string {
  if (search instanceof RegExp) {
    return input.replace(new RegExp(search.source, search.flags.includes("g") ? search.flags : `${search.flags}g`), replacement);
  }
  return input.split(search).join(replacement);
}
