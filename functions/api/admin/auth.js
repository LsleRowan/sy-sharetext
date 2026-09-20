const MAX_TOKENS = 5
const TOKEN_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

let _safeEqualImpl
if (typeof crypto.subtle?.timingSafeEqual === 'function') {
  _safeEqualImpl = (a, b) => crypto.subtle.timingSafeEqual(a, b)
} else {
  try {
    const { timingSafeEqual: nodeFn } = await import('node:crypto')
    _safeEqualImpl = nodeFn
  } catch {
    _safeEqualImpl = (a, b) => {
      if (a.length !== b.length) return false
      let diff = 0
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
      return diff === 0
    }
  }
}

export function timingSafeEqual(a, b) {
  const bufA = new TextEncoder().encode(a)
  const bufB = new TextEncoder().encode(b)
  if (bufA.length !== bufB.length) return false
  return _safeEqualImpl(bufA, bufB)
}

async function getTokens(kv) {
  const raw = await kv.get('admin:tokens')
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveTokens(kv, tokens) {
  await kv.put('admin:tokens', JSON.stringify(tokens))
}

function cleanExpiredTokens(tokens) {
  const now = Date.now()
  return tokens.filter(t => now - t.createdAt < TOKEN_MAX_AGE_MS)
}

export async function verifyAdmin(request, kv) {
  const cookieHeader = request.headers.get('Cookie')
  const token = cookieHeader?.match(/admin_token=([^;]+)/)?.[1]
  if (!token) return null

  let tokens = await getTokens(kv)
  const before = tokens.length
  tokens = cleanExpiredTokens(tokens)

  const match = tokens.find(t => timingSafeEqual(t.token, token))
  if (!match) return null

  if (tokens.length !== before) {
    await saveTokens(kv, tokens)
  }

  return token
}

export async function addToken(kv, token) {
  let tokens = await getTokens(kv)
  tokens = cleanExpiredTokens(tokens)

  tokens.push({ token, createdAt: Date.now() })

  if (tokens.length > MAX_TOKENS) {
    tokens = tokens.slice(-MAX_TOKENS)
  }

  await saveTokens(kv, tokens)
}

export async function removeToken(kv, token) {
  let tokens = await getTokens(kv)
  tokens = cleanExpiredTokens(tokens)
  tokens = tokens.filter(t => !timingSafeEqual(t.token, token))
  await saveTokens(kv, tokens)
}

export function setAuthCookie(token, request) {
  const proto = request?.headers?.get('x-forwarded-proto') || 'https'
  const secure = proto === 'https' ? '; Secure' : ''
  return `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=259200${secure}`
}

export function clearAuthCookie() {
  return 'admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
}
