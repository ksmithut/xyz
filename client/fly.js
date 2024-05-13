import { z } from 'zod'
import { createGraphqlClient } from './lib/graphql-client.js'

export const graphqlClient = createGraphqlClient('/api/fly/graphql')
const NONCE_HEADER = 'fly-machine-lease-nonce'

const organizationsQuery = graphqlClient.createQuery(
  `#graphql
    query QueryOrganizations($after: String) {
      organizations(after: $after) {
        edges {
          node {
            id
            name
            slug
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  z.object({
    organizations: z.object({
      edges: z.array(
        z.object({
          node: z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string()
          })
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable()
      })
    })
  }),
  z.object({
    after: z.string().nullable().optional()
  })
)

export async function getAllOrganizations() {
  return arrayFromAsyncGenerator(
    relayConnectionAll((after) =>
      organizationsQuery({ after }).then((data) => data.organizations)
    )
  )
}

const regionsQuery = graphqlClient.createQuery(
  `#graphql
    query PlatformRegions {
      platform {
        regions {
          code
          name
          gatewayAvailable
          requiresPaidPlan
        }
      }
    }
  `,
  z.object({
    platform: z.object({
      regions: z.array(
        z.object({
          code: z.string(),
          name: z.string(),
          gatewayAvailable: z.boolean(),
          requiresPaidPlan: z.boolean()
        })
      )
    })
  }),
  z.object({})
)

export async function listRegions() {
  const res = await regionsQuery({})
  return res.platform.regions
}

const vmSizesQuery = graphqlClient.createQuery(
  `#graphql
    query PlatformVMSizes {
      platform {
        vmSizes {
          cpuCores
          name
          memoryMb
          memoryIncrementsMb
        }
      }
    }
  `,
  z.object({
    platform: z.object({
      vmSizes: z.array(
        z.object({
          cpuCores: z.number(),
          name: z.string(),
          memoryMb: z.number(),
          memoryIncrementsMb: z.array(z.number())
        })
      )
    })
  }),
  z.object({})
)

export async function listVMSizes() {
  const res = await vmSizesQuery({})
  return res.platform.vmSizes
}

/**
 * @template T
 * @param {(after: string?) => Promise<{ edges: { node: T }[], pageInfo: { hasNextPage: boolean, endCursor: string? } }>} callback
 * @returns {AsyncGenerator<T>}
 */
export async function* relayConnectionAll(callback) {
  /** @type {string|null} */
  let after = null
  let hasNext = false
  do {
    const result = await callback(after)
    for (const edge of result.edges) yield edge.node
    hasNext = result.pageInfo.hasNextPage
    after = result.pageInfo.endCursor
  } while (hasNext && after)
}

/**
 * @template T
 * @param {AsyncGenerator<T>} generator
 */
export async function arrayFromAsyncGenerator(generator) {
  /** @type {T[]} */
  const items = []
  for await (const item of generator) items.push(item)
  return items
}

const appsWithRolesQuery = graphqlClient.createQuery(
  `#graphql
    query AppsWithRoles($after: String, $role: String) {
      apps(after: $after, role: $role) {
        edges {
          node {
            id
            role {
              __typename
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,
  z.object({
    apps: z.object({
      edges: z.array(
        z.object({
          node: z.object({
            id: z.string(),
            role: z
              .object({
                __typename: z.string()
              })
              .nullable()
          })
        })
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable()
      })
    })
  }),
  z.object({ after: z.string().nullish(), role: z.string().nullish() })
)

/**
 * @param {string} role
 */
export async function getAppsWithRole(role) {
  return arrayFromAsyncGenerator(
    relayConnectionAll((after) =>
      appsWithRolesQuery({ after, role }).then((data) => data.apps)
    )
  )
}

const appWithRolesQuery = graphqlClient.createQuery(
  `#graphql
    query AppsWithRoles($name: String) {
      app(name: $name) {
        id
        role {
          __typename
        }
      }
    }
  `,
  z.object({
    app: z.object({
      id: z.string(),
      role: z.object({ __typename: z.string() }).nullable()
    })
  }),
  z.object({ after: z.string().nullish(), role: z.string().nullish() })
)

const appSchema = z.object({
  id: z.string(),
  name: z.string(),
  machine_count: z.number(),
  network: z.string()
})
/**
 * @typedef {z.infer<typeof appSchema>} App
 */

const appsSchema = z.object({
  total_apps: z.number(),
  apps: z.array(appSchema)
})

/**
 * @param {string} slug
 */
export async function listApps(slug) {
  const searchParams = new URLSearchParams([['org_slug', slug]])
  const res = await fetch(`/api/fly/machines/v1/apps?${searchParams}`, {
    credentials: 'same-origin'
  })
  if (res.ok) {
    const apps = appsSchema.parse(await res.json())
    return apps.apps.toSorted((a, b) => {
      if (a.name > b.name) return 1
      if (a.name < b.name) return -1
      return 0
    })
  }
  throw Object.assign(new Error(`Could not list apps for org ${slug}`), {
    slug
  })
}

/**
 * @param {string} appName
 */
export async function getApp(appName) {
  const res = await fetch(
    `/api/fly/machines/v1/apps/${encodeURIComponent(appName)}`,
    { credentials: 'same-origin' }
  )
  return await res.json()
}

const machineSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    region: z.string(),
    instance_id: z.string(),
    private_ip: z.string(),
    config: z.object({
      guest: z
        .object({
          cpu_kind: z.string(),
          cpus: z.number(),
          memory_mb: z.number()
        })
        .optional(),
      metadata: z.record(z.string()).optional(),
      image: z.string().optional()
    }),
    image_ref: z.object({
      registry: z.string(),
      repository: z.string(),
      tag: z.string(),
      digest: z.string(),
      labels: z.record(z.string()).nullable()
    }),
    created_at: z.string(),
    updated_at: z.string(),
    events: z
      .array(
        z.object({
          id: z.string(),
          type: z.string(),
          status: z.string(),
          source: z.string(),
          timestamp: z.number()
        })
      )
      .optional(),
    checks: z
      .array(
        z.object({
          name: z.string(),
          status: z.string(),
          output: z.string().optional(),
          updated_at: z.string()
        })
      )
      .optional(),
    host_status: z.string()
  })
  .passthrough()
/**
 * @typedef {z.infer<typeof machineSchema>} Machine
 */

const machinesSchema = z.array(machineSchema)

/**
 * @param {TemplateStringsArray} strings
 * @param  {...string} exprs
 */
function uri(strings, ...exprs) {
  return strings.reduce(
    (str, part, i) => str + encodeURIComponent(exprs[i - 1]) + part
  )
}

/**
 * @param {string} appName
 */
function machinesBaseURL(appName) {
  return uri`/api/fly/machines/v1/apps/${appName}/machines`
}

/**
 * @param {string} appName
 * @param {string} machineId
 */
function machineBaseURL(appName, machineId) {
  return uri`/api/fly/machines/v1/apps/${appName}/machines/${machineId}`
}

/**
 * @param {string} appName
 */
function volumesBaseURL(appName) {
  return uri`/api/fly/machines/v1/apps/${appName}/volumes`
}

/**
 * @param {string} appName
 * @param {string} volumeId
 */
function volumeBaseURL(appName, volumeId) {
  return uri`/api/fly/machines/v1/apps/${appName}/volumes/${volumeId}`
}

/**
 * @param {string} appName
 */
export async function listAppMachines(appName) {
  const res = await fetch(machinesBaseURL(appName), {
    credentials: 'same-origin'
  })
  if (res.ok) {
    const machines = machinesSchema.parse(await res.json())
    return machines.toSorted((a, b) => {
      if (a.region > b.region) return 1
      if (a.region < b.region) return -1
      if (a.id > b.id) return 1
      if (a.id < b.id) return -1
      return 0
    })
  }
  const body = await res.text()
  throw Object.assign(
    new Error(`Error fetching app machines for ${appName}\n${body}`),
    { res, appName, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [params]
 * @param {string} [params.nonce]
 */
export async function restartMachine(appName, machineId, { nonce } = {}) {
  const headers = new Headers()
  if (nonce) headers.set(NONCE_HEADER, nonce)
  const res = await fetch(`${machineBaseURL(appName, machineId)}/restart`, {
    method: 'POST',
    headers,
    credentials: 'same-origin'
  })
  if (res.ok) return
  const body = await res.text()
  throw Object.assign(
    new Error(`Error restarting machine for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [options]
 * @param {string} [options.signal='SIGINT']
 * @param {number} [options.timeoutSeconds=5]
 * @param {string} [options.nonce]
 */
export async function stopMachine(
  appName,
  machineId,
  { signal = 'SIGINT', timeoutSeconds = 5, nonce } = {}
) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (nonce) headers.set(NONCE_HEADER, nonce)
  const res = await fetch(`${machineBaseURL(appName, machineId)}/stop`, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify({
      signal,
      timeout: timeoutSeconds
    })
  })
  if (res.ok) return
  const body = await res.text()
  throw Object.assign(
    new Error(`Error stopping machine for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [params]
 * @param {string} [params.nonce]
 */
export async function startMachine(appName, machineId, { nonce } = {}) {
  const headers = new Headers()
  if (nonce) headers.set(NONCE_HEADER, nonce)
  const res = await fetch(`${machineBaseURL(appName, machineId)}/start`, {
    method: 'POST',
    headers,
    credentials: 'same-origin'
  })
  if (res.ok) return
  const body = await res.text()
  throw Object.assign(
    new Error(`Error starting machine for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [options]
 * @param {boolean} [options.force]
 * @param {string} [options.nonce]
 */
export async function destroyMachine(
  appName,
  machineId,
  { force, nonce } = {}
) {
  const searchParams = new URLSearchParams()
  if (force) searchParams.set('force', force ? 'true' : 'false')
  const headers = new Headers()
  if (nonce) headers.set(NONCE_HEADER, nonce)
  const res = await fetch(
    `${machineBaseURL(appName, machineId)}?${searchParams}`,
    { method: 'DELETE', headers, credentials: 'same-origin' }
  )
  if (res.ok) return
  const body = await res.text()
  throw Object.assign(
    new Error(`Error destroying machine ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [options]
 * @param {'started'|'stopped'|'destroyed'} [options.state]
 * @param {string} [options.instanceId]
 */
export async function waitForState(
  appName,
  machineId,
  { state, instanceId } = {}
) {
  const searchParams = new URLSearchParams()
  if (state) searchParams.set('state', state)
  if (instanceId) searchParams.set('instance_id', instanceId)
  const res = await fetch(
    `${machineBaseURL(appName, machineId)}/wait?${searchParams}`,
    { credentials: 'same-origin' }
  )
  if (res.ok) return
  throw Object.assign(
    new Error(
      `Error waiting for machine state "${state ?? 'started'}" for ${appName}:${machineId}`
    ),
    { res, appName, machineId }
  )
}

/** @typedef {z.infer<typeof volumeSchema>} Volume */

const volumeSchema = z.object({
  attached_alloc_id: z.string().nullable(),
  attached_machine_id: z.string(),
  auto_backup_enabled: z.boolean(),
  block_size: z.number(),
  blocks: z.number(),
  blocks_avail: z.number(),
  blocks_free: z.number(),
  created_at: z.string(),
  encrypted: z.boolean(),
  fstype: z.string(),
  host_status: z.string(),
  id: z.string(),
  name: z.string(),
  region: z.string(),
  size_gb: z.number(),
  snapshot_retention: z.number(),
  state: z.string(),
  zone: z.string()
})

const volumesSchema = z.array(volumeSchema)

/**
 * @param {string} appName
 */
export async function listAppVolumes(appName) {
  const res = await fetch(volumesBaseURL(appName), {
    credentials: 'same-origin'
  })
  if (res.ok) return volumesSchema.parse(await res.json())
  throw Object.assign(new Error(`Error fetching volumes for ${appName}`), {
    res,
    appName
  })
}

const extendVolumeSchema = z.object({
  needs_restart: z.boolean(),
  volume: volumeSchema
})

/**
 * @param {string} appName
 * @param {string} volumeId
 * @param {object} params
 * @param {number} params.sizeGb
 */
export async function extendVolume(appName, volumeId, { sizeGb }) {
  const res = await fetch(`${volumeBaseURL(appName, volumeId)}/extend`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size_gb: sizeGb }),
    credentials: 'same-origin'
  })
  if (res.ok) return extendVolumeSchema.parse(await res.json())
  throw Object.assign(
    new Error(`Error extending for ${appName} volume ${volumeId} `),
    { res, appName, volumeId, sizeGb }
  )
}

const snapshotSchema = z.object({
  created_at: z.string(),
  digest: z.string(),
  id: z.string(),
  retention_days: z.number(),
  size: z.number(),
  status: z.string()
})

const snapshotsSchema = z.array(snapshotSchema)

/**
 * @param {string} appName
 * @param {string} volumeId
 */
export async function listVolumeSnapshots(appName, volumeId) {
  const res = await fetch(`${volumeBaseURL(appName, volumeId)}/snapshots`, {
    credentials: 'same-origin'
  })
  if (res.ok) return snapshotsSchema.parse(await res.json())
  throw Object.assign(
    new Error(`Error listing snapshots for ${appName} volume ${volumeId}`),
    { res, appName, volumeId }
  )
}

/**
 * @param {string} appName
 * @param {string} volumeId
 */
export async function createSnapshot(appName, volumeId) {
  const res = await fetch(`${volumeBaseURL(appName, volumeId)}/snapshots`, {
    method: 'POST',
    credentials: 'same-origin'
  })
  if (res.ok) return
  throw Object.assign(
    new Error(`Error creating snapshot for ${appName} volume ${volumeId}`),
    { res, appName, volumeId }
  )
}

const leaseSchema = z.object({
  description: z.string(),
  expires_at: z.number(),
  nonce: z.string(),
  owner: z.string(),
  version: z.string()
})

const leaseResultSchema = z.object({
  status: z.string(),
  data: leaseSchema
})

/**
 * @param {string} appName
 * @param {string} machineId
 */
export async function getLease(appName, machineId) {
  const res = await fetch(`${machineBaseURL(appName, machineId)}/lease`, {
    credentials: 'same-origin'
  })
  if (res.ok) return leaseSchema.parse(await res.json())
  const body = await res.text()
  throw Object.assign(
    new Error(`Error getting lease for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} [params]
 * @param {string} [params.description]
 * @param {number} [params.ttlSeconds]
 * @param {string} [params.nonce]
 */
export async function createLease(
  appName,
  machineId,
  { description, ttlSeconds, nonce } = {}
) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  if (nonce) headers.set('fly-machine-lease-nonce', nonce)
  const postBody = {}
  if (description) postBody.description = description
  if (ttlSeconds) postBody.ttl = ttlSeconds
  const res = await fetch(`${machineBaseURL(appName, machineId)}/lease`, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(postBody)
  })
  if (res.ok) {
    return leaseResultSchema.parse(await res.json())
  }
  const body = await res.text()
  throw Object.assign(
    new Error(`Error creating lease for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @param {string} appName
 * @param {string} machineId
 * @param {object} params
 * @param {string} params.nonce
 */
export async function releaseLease(appName, machineId, { nonce }) {
  const res = await fetch(`${machineBaseURL(appName, machineId)}/lease`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'fly-machine-lease-nonce': nonce }
  })
  if (res.ok) return
  const body = await res.text()
  throw Object.assign(
    new Error(`Error releasing lease for ${appName}:${machineId}\n${body}`),
    { res, appName, machineId, body }
  )
}

/**
 * @template T
 * @param {string} appName
 * @param {string} machineId
 * @param {object} params
 * @param {string} params.description
 * @param {number} [params.ttlSeconds]
 * @param {(params: { nonce: string }) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withLease(
  appName,
  machineId,
  { description, ttlSeconds = 30 },
  callback
) {
  const ac = new AbortController()
  const lease = await createLease(appName, machineId, {
    description,
    ttlSeconds
  })
  let nonce = lease.data.nonce
  let timeout = setTimeout(() => {})
  function renewLease() {
    if (ac.signal.aborted) return
    timeout = setTimeout(
      () => {
        createLease(appName, machineId, {
          description,
          nonce,
          ttlSeconds
        }).then((lease) => {
          nonce = lease.data.nonce
          renewLease()
        })
      },
      Math.max(ttlSeconds - 5, 1) * 1000
    )
  }
  renewLease()
  const params = {
    get nonce() {
      return nonce
    }
  }
  try {
    return await callback(params)
  } finally {
    ac.abort()
    clearTimeout(timeout)
    await releaseLease(appName, machineId, { nonce })
  }
}

/**
 * @param {string} appName
 * @param {number} count
 * @param {object} [params]
 * @param {string[]} [params.regions]
 */
export async function scaleCount(appName, count, { regions = [] } = {}) {
  const params = new URLSearchParams()
  regions.forEach((region) => params.append('region', region))
  const res = await fetch(
    `/api/fly/cli/apps/${encodeURIComponent(appName)}/scale/count/${encodeURIComponent(count)}?${params}`,
    { method: 'POST', credentials: 'same-origin' }
  )
  if (res.ok) return res
  const body = await res.text()
  throw Object.assign(
    new Error(`Could not scale app ${appName} to ${count}\n${body}`),
    { appName, count, regions, body }
  )
}

// https://github.com/superfly/fly-go/blob/acab0fddc060082a0adfa30e1f8937553f99ea47/machine_types.go#L419-L444
const MIN_MEMORY_MB_PER_SHARED_CPU = 256
const MIN_MEMORY_MB_PER_CPU = 2048
const MAX_MEMORY_MB_PER_SHARED_CPU = 2048
const MAX_MEMORY_MB_PER_CPU = 8192

export const MACHINE_PRESETS = [
  {
    name: 'shared-cpu-1x',
    cpuKind: 'shared',
    cpus: 1,
    memoryMb: 1 * MIN_MEMORY_MB_PER_SHARED_CPU
  },
  {
    name: 'shared-cpu-2x',
    cpuKind: 'shared',
    cpus: 2,
    memoryMb: 2 * MIN_MEMORY_MB_PER_SHARED_CPU
  },
  {
    name: 'shared-cpu-4x',
    cpuKind: 'shared',
    cpus: 4,
    memoryMb: 4 * MIN_MEMORY_MB_PER_SHARED_CPU
  },
  {
    name: 'shared-cpu-8x',
    cpuKind: 'shared',
    cpus: 8,
    memoryMb: 8 * MIN_MEMORY_MB_PER_SHARED_CPU
  },
  {
    name: 'performance-1x',
    cpuKind: 'performance',
    cpus: 1,
    memoryMb: 1 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'performance-2x',
    cpuKind: 'performance',
    cpus: 2,
    memoryMb: 2 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'performance-4x',
    cpuKind: 'performance',
    cpus: 4,
    memoryMb: 4 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'performance-8x',
    cpuKind: 'performance',
    cpus: 8,
    memoryMb: 8 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'performance-16x',
    cpuKind: 'performance',
    cpus: 16,
    memoryMb: 16 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'a100-40gb',
    gpuKind: 'a100-pcie-40gb',
    gpus: 1,
    cpuKind: 'performance',
    cpus: 8,
    memoryMb: 16 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'a100-80gb',
    gpuKind: 'a100-sxm4-80gb',
    gpus: 1,
    cpuKind: 'performance',
    cpus: 8,
    memoryMb: 16 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'l40s',
    gpuKind: 'l40s',
    gpus: 1,
    cpuKind: 'performance',
    cpus: 8,
    memoryMb: 16 * MIN_MEMORY_MB_PER_CPU
  },
  {
    name: 'a10',
    gpuKind: 'a10',
    gpus: 1,
    cpuKind: 'performance',
    cpus: 8,
    memoryMb: 16 * MIN_MEMORY_MB_PER_CPU
  }
]
