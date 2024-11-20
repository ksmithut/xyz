#!/usr/bin/env node

import { HOSTNAME, PORT, OPEN } from './config.js'
import http from 'node:http'
import events from 'node:events'
import express from 'express'
import cookieParser from 'cookie-parser'
import open from 'open'
import { TOKEN } from './configstore.js'
import { httpUnlisten } from './lib/http-unlisten.js'
import flyRouter from './fly.js'
import favoritesRouter from './favorites.js'
import { requireAuth, signIn } from './auth.js'

const PUBLIC_DIR = new URL('../public/', import.meta.url)

const app = express()
app.disable('x-powered-by')
const server = http.createServer(app)

app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.once('close', () => {
    const end = process.hrtime.bigint()
    const duration = (Number(end - start) / 1e6).toFixed(2)
    const url = new URL(req.originalUrl, `http://localhost`)
    console.log(req.method, url.pathname, `  ${duration}ms`)
  })
  next()
})
app.use(cookieParser())

app.post('/api/auth', express.json(), signIn())
app.get('/api/auth', requireAuth(), (req, res) => {
  res.end('ok')
})
app.use('/api/fly', requireAuth(), flyRouter)
app.use('/api/favorites', favoritesRouter)

app.use(express.static(PUBLIC_DIR.pathname))
app.get('/*t', (req, res, next) => {
  if (!req.accepts('html')) return next()
  res.sendFile('index.html', { root: PUBLIC_DIR.pathname })
})

app.use(
  /** @type {import('express').ErrorRequestHandler} */
  (error, req, res, next) => {
    console.error(req.method, req.originalUrl, error)
    res.status(500).end('Internal Server Error')
  }
)

await events.once(
  server.listen({ hostname: HOSTNAME, port: PORT }),
  'listening'
)
const tokenURL = new URL('/auth', `http://${HOSTNAME}:${PORT}`)
tokenURL.searchParams.set('token', TOKEN)
console.log(`\nxyz listening at ${tokenURL.origin}\n`)
if (OPEN) await open(tokenURL.toString())

const closeServer = httpUnlisten(server)

async function stop() {
  await closeServer(5000)
}

let called = false
function shutdown() {
  if (called) return
  called = true
  stop()
    .then(() => process.exit())
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
process.once('SIGUSR2', shutdown)
