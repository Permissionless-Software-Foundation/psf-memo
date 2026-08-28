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

    console.log('Use cases initialized.')

    return true
  }
}

export default UseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T20:07:25.668Z","module_hash":"4056d0f29e6828f95ab07f34186b3cef9d93f244c3d6914aa52463abdc224f32","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":18,"end_line":38,"hash":"bf14b8bc15f8a9ad966bb4d2a2de92072be3ec695af1aef5604495f5cf681e34"},{"id":"func/UseCases.start","name":"UseCases.start","line":40,"end_line":88,"hash":"f6fbf584c0e6786294a352fdae4e7a01fef1d24d31ca5202a33f5ed5e1772020"}]}
// mutate4javascript-manifest-end
