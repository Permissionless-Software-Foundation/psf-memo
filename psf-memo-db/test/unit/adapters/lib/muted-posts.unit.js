/*
  Unit tests for the shared mute-filtering helpers used across query adapters.
*/
import { assert } from 'chai'
import { loadMutedAddrs, isMutedPost } from '../../../../src/adapters/lib/muted-posts.js'

describe('#muted-posts', () => {
  describe('loadMutedAddrs', () => {
    it('returns an empty Set when no muteQuery is provided', async () => {
      const addrs = await loadMutedAddrs(null, 'viewer')
      assert.instanceOf(addrs, Set)
      assert.equal(addrs.size, 0)
    })

    it('returns an empty Set when no viewer address is provided', async () => {
      const addrs = await loadMutedAddrs({ listMuted: async () => ['a'] }, null)
      assert.instanceOf(addrs, Set)
      assert.equal(addrs.size, 0)
    })

    it('returns a Set of the addresses muted by the viewer', async () => {
      const muteQuery = { listMuted: async () => ['a', 'b', 'a'] }
      const addrs = await loadMutedAddrs(muteQuery, 'viewer')
      assert.deepEqual(Array.from(addrs).sort(), ['a', 'b'])
    })
  })

  describe('isMutedPost', () => {
    it('returns false when the mute set is empty', async () => {
      const result = await isMutedPost(async () => ({ addr: 'a' }), 'txid', new Set())
      assert.equal(result, false)
    })

    it('returns false when the post is authored by a non-muted address', async () => {
      const getPost = async () => ({ addr: 'other' })
      const result = await isMutedPost(getPost, 'txid', new Set(['muted']))
      assert.equal(result, false)
    })

    it('returns true when the post is authored by a muted address', async () => {
      const getPost = async () => ({ addr: 'muted' })
      const result = await isMutedPost(getPost, 'txid', new Set(['muted']))
      assert.equal(result, true)
    })

    it('returns false for a missing post even when other posts are muted', async () => {
      // A post that cannot be resolved must never be treated as muted, so it is
      // not excluded from a feed on a lookup failure.
      const getPost = async () => null
      const result = await isMutedPost(getPost, 'missing', new Set(['muted']))
      assert.equal(result, false)
    })
  })
})
