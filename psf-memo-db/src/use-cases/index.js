/*
  Use cases for psf-memo-db.
*/

import ListRecentProfiles from './list-recent-profiles.js'
import ListRecentPosts from './list-recent-posts.js'
import ListPostsByAddr from './list-posts-by-addr.js'
import ListFollowingFeed from './list-following-feed.js'
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
import SearchAll from './search-all.js'

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
    this.listFollowingFeed = null
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
    this.searchAll = null
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

    this.listFollowingFeed = new ListFollowingFeed({
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

    this.searchAll = new SearchAll({
      adapters: this.adapters
    })

    console.log('Use cases initialized.')

    return true
  }
}

export default UseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T19:03:33.402Z","module_hash":"c2846cfbc10b257fb2bc78b233698bcb3629774248ed55c01936745fa6542537","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":25,"end_line":52,"hash":"4c06a996b9753331ed29694f0c1939617e0da1a4255244aecd7fa2f4eb4521f3"},{"id":"func/UseCases.start","name":"UseCases.start","line":54,"end_line":130,"hash":"358ac54d6f521176f500c42ce8577b5f2fcc9051b6ae095e4d5b07cc35a7b81a"}]}
// mutate4javascript-manifest-end
