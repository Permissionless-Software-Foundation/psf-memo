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
  'addrPostHeights',
  'postParents',
  'postChildren',
  'likes',
  'postLikes',
  'names',
  'profiles',
  'profilePics',
  'profileRecency',
  'follows',
  'followeeHeights',
  'mutes',
  'rooms',
  'topicSummaries',
  'topicRecency',
  'processErrors',
  'ptxs',
  'polls',
  'pollOptions',
  'pollVotes'
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-20T21:57:39.141Z","module_hash":"5416df84f1fef398fd6ddd886f4467c5421e331aaa4299599cbfda271d2d7d7b","functions":[{"id":"func/LevelDb.constructor","name":"LevelDb.constructor","line":39,"end_line":46,"hash":"1c866e2484a08aa32503fb55bdfc2d711d2aedc0410e6fe749be66ec99e0f400"},{"id":"func/LevelDb.openDbs","name":"LevelDb.openDbs","line":48,"end_line":62,"hash":"1de94c7f46c342506f27b0066597f827bf1a57fa2caf2e1b6587701ae0e3c32f"},{"id":"func/LevelDb.getDbList","name":"LevelDb.getDbList","line":64,"end_line":66,"hash":"5a150ab18ab1e71f5a626c8fdd6f9dbe5d9a2406ad720f1875df32940de20976"},{"id":"func/LevelDb.closeDbs","name":"LevelDb.closeDbs","line":68,"end_line":73,"hash":"de21953bce0228ed9fffef541dc8326fe3cec9f8b3c85afd75eeb4671c15effe"},{"id":"func/LevelDb.ensureDirectories","name":"LevelDb.ensureDirectories","line":75,"end_line":80,"hash":"9ecaa7313531e06fab4148077786152467b83c19dee074a6218e8e43f4436b75"}]}
// mutate4javascript-manifest-end
