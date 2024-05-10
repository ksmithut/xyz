import { PassThrough } from 'node:stream'

/**
 * @param  {...import('node:stream').Readable} streams
 */
export function mergeStreams(...streams) {
  const ended = new WeakSet()
  return streams.reduce(
    /**
     * @param {import('node:stream').PassThrough} passThrough
     * @returns {import('node:stream').PassThrough}
     */
    (passThrough, stream, _index, allStreams) => {
      stream.pipe(passThrough, { end: false })
      stream.once('end', () => {
        ended.add(stream)
        if (allStreams.every((stream) => ended.has(stream))) passThrough.end()
      })
      return passThrough
    },
    new PassThrough()
  )
}
