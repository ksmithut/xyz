import fs from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import { FAVORITES_FILE } from './config.js'
import { CONFIG_DIR } from './configstore.js'
import { toHex } from './lib/encoding.js'

const router = express.Router()

const GLOBAL_FAVORITES_FILE = path.resolve(CONFIG_DIR, 'xyz.favorites')

router.get('/', async (req, res, next) => {
  res.json(await getFavorites())
})

export default router

/**
 * @typedef {object} Favorite
 * @property {string} id
 * @property {string} label
 * @property {string[]} apps
 */

function getFavorites() {
  return fs
    .readFile(FAVORITES_FILE, 'utf-8')
    .catch((e) => {
      if (e.code === 'ENOENT') {
        return fs.readFile(GLOBAL_FAVORITES_FILE, 'utf-8').catch(() => '')
      }
      return ''
    })
    .then((content) => {
      /** @type {string[]?} */
      let current = null
      /** @type {Favorite[]} */
      const favorites = []
      for (let line of content.split('\n')) {
        line = line.trim()
        if (!line) continue
        if (line.includes('===')) {
          const label = line.replace(/={3,}$/g, '').trim()
          /** @type {Favorite} */
          const favorite = { id: '', label, apps: [] }
          favorites.push(favorite)
          current = favorite.apps
          continue
        }
        if (!current) {
          /** @type {Favorite} */
          const favorite = { id: '', label: '', apps: [] }
          favorites.push(favorite)
          current = favorite.apps
        }
        current.push(line)
      }
      return Promise.all(
        favorites.map(async (favorite) => {
          const textEncoder = new TextEncoder()
          favorite.id = toHex(
            new Uint8Array(
              await crypto.subtle.digest(
                'SHA-256',
                textEncoder.encode(JSON.stringify(favorite))
              )
            )
          )
          return favorite
        })
      )
    })
}
