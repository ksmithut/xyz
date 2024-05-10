/**
 * @param {import('node:http').Server | import('node:https').Server} server
 */
export function httpUnlisten(server) {
  /**
   * @param {number} timeoutMs
   */
  return async function unlisten(timeoutMs = Infinity) {
    let gracefully = true
    /** @type {NodeJS.Timeout|null} */
    let timeout = null
    if (Number.isFinite(timeoutMs)) {
      timeout = setTimeout(() => {
        gracefully = false
        server.closeAllConnections()
      }, timeoutMs)
    }
    const closePromise = new Promise((resolve) => {
      server.close(() => {
        if (timeout) clearTimeout(timeout)
        resolve(null)
      })
    })
    server.closeIdleConnections()
    await closePromise
    return gracefully
  }
}
