/*
  Adapter library for Memo indexer LevelDB instances.
*/

import level from 'level'
import shell from 'shelljs'
import * as url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const dbDir = `${__dirname}/../../leveldb`

const DB_NAMES = [
  'status',
  'posts',
  'postHeights',
  'postParents',
  'postChildren',
  'likes',
  'names',
  'profiles',
  'profilePics',
  'follows',
  'rooms',
  'processErrors',
  'ptxs'
]

class LevelDb {
  constructor () {
    this.level = level
    this.shell = shell
    this.openDbs = this.openDbs.bind(this)
    this.closeDbs = this.closeDbs.bind(this)
    this.ensureDirectories = this.ensureDirectories.bind(this)
    this.getDbList = this.getDbList.bind(this)
  }

  openDbs () {
    console.log('Opening LevelDB databases...')
    const dbs = {}

    for (const name of DB_NAMES) {
      const prop = `${name}Db`
      dbs[prop] = this.level(`${__dirname}/../../leveldb/current/${name}`, {
        valueEncoding: 'json',
        cacheSize: name === 'posts' ? 512 * 1024 * 1024 : 64 * 1024 * 1024
      })
      this[prop] = dbs[prop]
    }

    return dbs
  }

  getDbList () {
    return DB_NAMES.map((name) => this[`${name}Db`])
  }

  async closeDbs () {
    for (const name of DB_NAMES) {
      await this[`${name}Db`].close()
    }
    return true
  }

  async ensureDirectories () {
    this.shell.mkdir('-p', `${dbDir}/current`)
    this.shell.mkdir('-p', `${dbDir}/zips`)
    this.shell.mkdir('-p', `${dbDir}/backup`)
    return true
  }
}

export { DB_NAMES, dbDir }
export default LevelDb
