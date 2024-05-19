import process from 'node:process'
import util from 'node:util'
import { exec } from 'node:child_process'
import open from 'open'
import { TOKEN, CONFIG_DIR } from './configstore.js'

const execAsync = util.promisify(exec)

const { values, positionals } = util.parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    hostname: {
      type: 'string'
    },
    port: {
      type: 'string',
      short: 'p'
    },
    favorites: {
      type: 'string',
      short: 'f'
    },
    open: {
      type: 'boolean',
      short: 'o'
    },
    help: {
      type: 'boolean',
      short: 'h'
    }
  }
})

if (positionals[0] === 'help' || values.help) {
  console.log(`
xyz <command>

Commands:

  xyz [options]  Start the xyz server
  xyz config     Open the config directory
  xyz token      Print out the generated auth token
  xyz help       Print out this help message

Options:

  -h,--hostname [hostname]    The hostname to bind to. default: localhost
  -p,--port [port]            The port to bind to. default: 2345
  -f,--favorites [favorites]  The path to your "xyz.favorites" file. default: ./xyz.favorites
  -o,--open                   Open up the web page after starting
  -h,--help                   Print out this help message
`)
  process.exit(0)
}

if (positionals[0] === 'config') {
  console.log(CONFIG_DIR)
  await open(CONFIG_DIR)
  process.exit(0)
}

if (positionals[0] === 'token') {
  console.log(TOKEN)
  process.exit(0)
}

export const FLY_GRAPHQL_URL = 'https://app.fly.io/graphql'
export const FLY_MACHINES_API = 'https://api.machines.dev/'
export const FLY_TOKEN = (await execAsync('fly auth token')).stdout
export const FAVORITES_FILE = values.favorites ?? 'xyz.favorites'
export const HOSTNAME = values.hostname ?? 'localhost'
export const PORT = Number.parseInt(values.port ?? '2345')
export const OPEN = values.open ?? false

if (Number.isNaN(PORT)) console.log('--port [port] must be a number')
