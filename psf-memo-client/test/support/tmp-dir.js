/*
  Shared per-test scratch directory helper for the client unit suite.

  The acceptance-runner test files each need a clean directory under the
  client's tmp/. The prefix namespaces the directory per suite so a leaked run
  from one file cannot collide with another.
*/
'use strict'

const fs = require('node:fs')
const path = require('node:path')

function makeTmpDir (prefix) {
  return function tmpDir (name) {
    const dir = path.join(__dirname, '..', '..', 'tmp', `${prefix}-${name}-${process.pid}`)
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    return dir
  }
}

module.exports = { makeTmpDir }
