import { spawn } from 'child_process'
import express from 'express'
import { proxyRequest } from './lib/proxy-request.js'
import { mergeStreams } from './lib/stream-helpers.js'
import { FLY_MACHINES_API, FLY_GRAPHQL_URL, FLY_TOKEN } from './config.js'

const router = express.Router()

router.use(
  '/machines',
  proxyRequest(
    FLY_MACHINES_API,
    { headers: { Authorization: `Bearer ${FLY_TOKEN}` } },
    { allowedHeaders: ['content-type', 'content-encoding'] }
  )
)
router.use(
  '/graphql',
  proxyRequest(
    FLY_GRAPHQL_URL + '/',
    { headers: { Authorization: `Bearer ${FLY_TOKEN}` } },
    { allowedHeaders: ['content-type'] }
  )
)

router.post('/cli/apps/:app/scale/count/:count', (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const regions = url.searchParams.getAll('region')
  const count = Number.parseInt(req.params.count, 10)
  if (Number.isNaN(count) || count < 0) {
    res.status(400).send('Invalid count')
    return
  }
  const flags = ['--yes', '--app', req.params.app]
  if (regions.length) flags.push('--region', regions.join(','))
  const proc = spawn('fly', ['scale', 'count', count.toString(), ...flags])
  mergeStreams(proc.stdout, proc.stderr).pipe(res)
})

router.post('/cli/apps/:app/scale/vm/:size', (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const vmMemoryRaw = url.searchParams.get('vm_memory')
  /** @type {number|undefined} */
  let vmMemory
  if (vmMemoryRaw) {
    vmMemory = Number.parseInt(vmMemoryRaw, 10)
    if (Number.isNaN(vmMemory) || vmMemory < 0) {
      res.status(400).send('Invalid vm_memory')
      return
    }
  }
  const flags = ['--yes', '--app', req.params.app]
  if (vmMemory) flags.push('--vm-memory', vmMemory.toString())
  const proc = spawn('fly', ['scale', 'vm', req.params.size, ...flags])
  mergeStreams(proc.stdout, proc.stderr).pipe(res)
})

export default router
