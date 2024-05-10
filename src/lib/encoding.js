/** @type {string[]} */
const byteToHex = []
for (let n = 0; n <= 0xff; ++n) byteToHex.push(n.toString(16).padStart(2, '0'))

/**
 * @param {Uint8Array} array
 */
export function toHex(array) {
  let output = ''
  for (const byte of array) output += byteToHex[byte]
  return output
}

/**
 * @type {Record<string, number>}
 */
const hexToNibble = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15
}

/**
 * @param {string} string
 */
export function fromHex(string) {
  const bytes = new Uint8Array(Math.floor((string || '').length / 2))
  let i
  for (i = 0; i < bytes.length; i++) {
    const a = hexToNibble[string[i * 2]]
    const b = hexToNibble[string[i * 2 + 1]]
    if (a === undefined || b === undefined) break
    bytes[i] = (a << 4) | b
  }
  return i === bytes.length ? bytes : bytes.slice(0, i)
}
