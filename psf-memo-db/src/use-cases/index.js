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
import MuteState from './mute-state.js'
import ListMuted from './list-muted.js'
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
    this.muteState = null
    this.listMuted = null
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

    this.muteState = new MuteState({
      adapters: this.adapters
    })

    this.listMuted = new ListMuted({
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
// {"version":1,"tested_at":"2026-08-29T03:34:22.727Z","module_hash":"bd1af3666615a359eb970d1576472fe7a792fbfd135972e81ba50f1441976e94","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":23,"end_line":48,"hash":"511ff53d6fe3084c42bc443e67183991e065fe6432d26291d8f44fcf3ee3fe94"},{"id":"func/UseCases.start","name":"UseCases.start","line":50,"end_line":118,"hash":"4a94f92a0c335ee536da858df44d13e81930b86df9e27ebff75d71753865e299"}]}
// mutate4javascript-manifest-end
