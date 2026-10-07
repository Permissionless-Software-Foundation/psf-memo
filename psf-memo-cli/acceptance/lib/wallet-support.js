/*
  Shared fake wallet for broadcast acceptance steps.

  A wallet stand-in that records each OP_RETURN action it receives on the
  scenario world and returns the configured txid or rejects with the configured
  error. Command-level steps (memo-post) pass a cash address so the shared
  wallet resolver can read it; library-level steps (memo-broadcast) omit it.
*/

// Local libraries
import { buildMemoPushes } from '../../src/lib/memo-broadcast.js'

export function createRecordingWallet (world, { cashAddress, hasSpendableOutput = false } = {}) {
  return {
    walletInfo: { cashAddress },
    hasSpendableOutput,
    initialized: false,
    async initialize () {
      this.initialized = true
    },
    async sendOpReturn (msgOrFields, prefix, bchOutput = []) {
      if (world.broadcastError) {
        throw new Error(world.broadcastError)
      }
      const fields = Array.isArray(msgOrFields) ? msgOrFields : [msgOrFields]
      world.broadcast = { prefix, pushes: buildMemoPushes(prefix, fields), bchOutput }
      world.broadcastCount = (world.broadcastCount || 0) + 1
      return world.broadcastTxid
    }
  }
}
