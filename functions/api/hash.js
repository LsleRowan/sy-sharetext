import { timingSafeEqual } from './admin/auth.js'

const ITERATIONS = 100000

async function deriveKey(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    passwordKey,
    256
  )
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derivedKey = await deriveKey(password, salt)
  return `${toHex(salt)}:${derivedKey}`
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':')
  if (!saltHex || !keyHex) return false
  const salt = fromHex(saltHex)
  const derivedKey = await deriveKey(password, salt)
  return timingSafeEqual(derivedKey, keyHex)
}

export async function hashSitePassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derivedKey = await deriveKey(password, salt)
  return `${toHex(salt)}:${derivedKey}`
}

export async function verifySitePassword(password, stored) {
  return verifyPassword(password, stored)
}
