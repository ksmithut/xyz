import { fromHex } from './lib/encoding.js'
import { TOKEN } from './configstore.js'

/** @type {WeakMap<import('express').Request, Promise<boolean>>} */
const authed = new WeakMap()

const COOKIE_NAME = 'xyz.auth'
const RAW_TOKEN = fromHex(TOKEN)

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 */
async function safeCheckTokenEquality(a, b) {
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', a).then((value) => new Uint8Array(value)),
    crypto.subtle.digest('SHA-256', b).then((value) => new Uint8Array(value))
  ])
  const length = a.length
  let diff = aHash.length ^ bHash.length
  for (let i = 0; i < length; i++) diff |= aHash[i] ^ bHash[i]
  return diff === 0
}

/**
 * @param {string?} [value]
 */
async function checkToken(value) {
  if (!value) return false
  const matched = await safeCheckTokenEquality(fromHex(value), RAW_TOKEN).catch(
    () => false
  )
  return matched
}

/**
 * @returns {import('express').RequestHandler}
 */
export function requireAuth() {
  return (req, res, next) => {
    let isAuthed = authed.get(req)
    if (!isAuthed) {
      isAuthed = checkToken(req.cookies[COOKIE_NAME])
      authed.set(req, isAuthed)
    }
    isAuthed
      .then((matched) => {
        if (matched) return next()
        return res.status(401).json({ error: 'Not Authenticated' })
      })
      .catch(next)
  }
}

/**
 * @returns {import('express').RequestHandler}
 */
export function signIn() {
  return (req, res, next) => {
    const token = req.body?.token
    checkToken(token)
      .then((matched) => {
        if (!matched) return res.status(401).json({ error: 'Invalid token' })
        return res
          .cookie(COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/api'
          })
          .end()
      })
      .catch(next)
  }
}
