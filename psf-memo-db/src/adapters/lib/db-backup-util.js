/*
  Pure helpers for DbBackup filename and path computation.

  These functions are side-effect free and unit-testable, so the
  environmentally unsuitable zip/unzip adapter can stay a thin shell.
*/

export function zipFileName (height) {
  return `memo-indexer-${height}.zip`
}

export function oldBackupHeight (height, epoch, backupQty) {
  return height - (epoch * backupQty)
}

export function oldBackupZipPath (oldHeight) {
  return `zips/memo-indexer-${oldHeight}.zip`
}

export function backupFilePath (dbDir, height) {
  return `${dbDir}/zips/${zipFileName(height)}`
}
