/*
  Use cases for psf-memo-db.
*/

import ListRecentProfiles from './list-recent-profiles.js'
import ListRecentPosts from './list-recent-posts.js'
import ListPostsByAddr from './list-posts-by-addr.js'
import GetPostThread from './get-post-thread.js'
import FollowState from './follow-state.js'
import ListFollowing from './list-following.js'
import ListFollowers from './list-followers.js'
import ListTopics from './list-topics.js'
import ListTopicPosts from './list-topic-posts.js'
import TopicFollowState from './topic-follow-state.js'
import ListTopicFollowers from './list-topic-followers.js'
import GetPoll from './get-poll.js'
import GetPollOptions from './get-poll-options.js'
import GetPollVotes from './get-poll-votes.js'

class UseCases {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters

    if (!this.adapters) {
      throw new Error(
        'Adapters required when instantiating UseCases.'
      )
    }

    this.listRecentProfiles = null
    this.listRecentPosts = null
    this.listPostsByAddr = null
    this.getPostThread = null
    this.followState = null
    this.listFollowing = null
    this.listFollowers = null
    this.listTopics = null
    this.listTopicPosts = null
    this.topicFollowState = null
    this.listTopicFollowers = null
    this.getPoll = null
    this.getPollOptions = null
    this.getPollVotes = null
  }

  async start () {
    this.listRecentProfiles = new ListRecentProfiles({
      adapters: this.adapters
    })

    this.listRecentPosts = new ListRecentPosts({
      adapters: this.adapters
    })

    this.listPostsByAddr = new ListPostsByAddr({
      adapters: this.adapters
    })

    this.getPostThread = new GetPostThread({
      adapters: this.adapters
    })

    this.followState = new FollowState({
      adapters: this.adapters
    })

    this.listFollowing = new ListFollowing({
      adapters: this.adapters
    })

    this.listFollowers = new ListFollowers({
      adapters: this.adapters
    })

    this.listTopics = new ListTopics({
      adapters: this.adapters
    })

    this.listTopicPosts = new ListTopicPosts({
      adapters: this.adapters
    })

    this.topicFollowState = new TopicFollowState({
      adapters: this.adapters
    })

    this.listTopicFollowers = new ListTopicFollowers({
      adapters: this.adapters
    })

    this.getPoll = new GetPoll({
      adapters: this.adapters
    })

    this.getPollOptions = new GetPollOptions({
      adapters: this.adapters
    })

    this.getPollVotes = new GetPollVotes({
      adapters: this.adapters
    })

    console.log('Use cases initialized.')

    return true
  }
}

export default UseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:02:43.390Z","module_hash":"cf2bffa7de787c479a3849641f6f6ead863cea555a6c2db995179732bcf05466","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":21,"end_line":44,"hash":"3fb83ec6337d0634fa8b1e7431e0e94c2aa4be2d3cbc930841d294a08b465f98"},{"id":"func/UseCases.start","name":"UseCases.start","line":46,"end_line":106,"hash":"c876c85df5fd28146e8f6bce6aa7c48eed7ff3303cb3384cf0a9704926b837a3"}]}
// mutate4javascript-manifest-end
