/*
  Unit tests for the UseCases composition root.
*/

import { assert } from 'chai'
import UseCases from '../../../src/use-cases/index.js'

describe('#UseCases', () => {
  // Build a minimal adapters bundle that satisfies every use-case constructor
  // so start() can instantiate the full set.
  function makeAdapters () {
    return {
      postQuery: {},
      profileQuery: {},
      followQuery: {
        listFollowing: () => [],
        listFollowers: () => []
      },
      muteQuery: {
        listMuted: () => []
      },
      topicQuery: {},
      searchQuery: {},
      notificationsQuery: {},
      pollQuery: {}
    }
  }

  describe('#constructor', () => {
    it('throws when adapters are missing', () => {
      assert.throws(() => new UseCases({}), /Adapters required/)
    })
  })

  describe('#start', () => {
    it('instantiates every use case and returns true', async () => {
      const uut = new UseCases({ adapters: makeAdapters() })
      const result = await uut.start()

      assert.equal(result, true)
      assert.isNotNull(uut.listRecentProfiles)
      assert.isNotNull(uut.listRecentPosts)
      assert.isNotNull(uut.listPostsByAddr)
      assert.isNotNull(uut.listFollowingFeed)
      assert.isNotNull(uut.getPostThread)
      assert.isNotNull(uut.followState)
      assert.isNotNull(uut.listFollowing)
      assert.isNotNull(uut.listFollowers)
      assert.isNotNull(uut.muteState)
      assert.isNotNull(uut.listMuted)
      assert.isNotNull(uut.listTopics)
      assert.isNotNull(uut.listTopicPosts)
      assert.isNotNull(uut.topicFollowState)
      assert.isNotNull(uut.listTopicFollowers)
      assert.isNotNull(uut.getPoll)
      assert.isNotNull(uut.getPollOptions)
      assert.isNotNull(uut.getPollVotes)
      assert.isNotNull(uut.searchAll)
      assert.isNotNull(uut.listNotifications)
    })
  })
})
