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
  exitOnMissingBackup: process.env.EXIT_ON_MISSING_BACKUP === 'true',
  // Number of blocks before the chain tip that still count as a notification.
  // GET /posts/notifications/:addr uses cutoff = chainBlockHeight - window.
  notificationBlockWindow: process.env.NOTIFICATION_BLOCK_WINDOW
    ? parseInt(process.env.NOTIFICATION_BLOCK_WINDOW, 10)
    : 25000
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T17:43:31.901Z","module_hash":"6fe85b8d6a9d6d98e30421730a4c0ec82c89167573cc77ce433a715bc8a06382","functions":[]}
// mutate4javascript-manifest-end
