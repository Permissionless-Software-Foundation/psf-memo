import 'dotenv/config'

import * as url from 'url'
import { readFileSync } from 'fs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const pkgInfo = JSON.parse(readFileSync(`${__dirname}/../../package.json`))

export default {
  port: process.env.PORT ? parseInt(process.env.PORT) : 5021,
  noMongo: true,
  useIpfs: false,
  version: pkgInfo.version,
  backupQty: process.env.BACKUP_QTY ? parseInt(process.env.BACKUP_QTY) : 3,
  exitOnMissingBackup: process.env.EXIT_ON_MISSING_BACKUP === 'true'
}
