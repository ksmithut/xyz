import { Readable } from 'node:stream'
import express from 'express'

/**
 * @param {URL | string} input
 * @param {RequestInit} [init]
 * @param {object} [config]
 * @param {string[]} [config.allowedHeaders]
 * @returns {import('express').RequestHandler}
 */
export function proxyRequest(input, init, { allowedHeaders = [] } = {}) {
  const ALLOWED_HEADERS = new Set(allowedHeaders)
  const router = express.Router()
  router.use(async (req, res, next) => {
    const targetURL = new URL('.' + req.url, input)
    try {
      const headers = new Headers(init?.headers)
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        headers.append(req.rawHeaders[i], req.rawHeaders[i + 1])
      }
      const response = await fetch(targetURL, {
        ...init,
        method: req.method,
        headers,
        // @ts-ignore
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? Readable.toWeb(req)
            : null,
        duplex: 'half'
      })
      for (const [name, value] of response.headers) {
        if (ALLOWED_HEADERS.has(name)) res.appendHeader(name, value)
      }
      res.writeHead(response.status)
      // @ts-ignore
      Readable.fromWeb(response.body).pipe(res)
    } catch (error) {
      next(error)
    }
  })
  return router
}
