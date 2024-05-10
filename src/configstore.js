import path from 'node:path'
import ConfigStore from 'configstore'
import { z } from 'zod'
import { toHex } from './lib/encoding.js'

const configStore = new ConfigStore('@ksmithut/xyz', {
  token: toHex(crypto.getRandomValues(new Uint8Array(32)))
})

const hexString = z.string().regex(/^([a-fA-F0-9]{2}){32,}$/)

export const TOKEN = hexString.parse(configStore.get('token'))
export const CONFIG_DIR = path.dirname(configStore.path)
