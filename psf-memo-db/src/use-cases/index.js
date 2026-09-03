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
import ListNotifications from './list-notifications.js'

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
    this.listNotifications = null
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

    this.listNotifications = new ListNotifications({
      adapters: this.adapters
    })

    console.log('Use cases initialized.')

    return true
  }
}

export default UseCases

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-02T20:16:09.198Z","module_hash":"246be2cf01feda067a62a77a8502f76cef8569cb63dff49bf7b139fdd25dd355","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":26,"end_line":54,"hash":"e8f3118c89d65ad1abddc4ad92dd13c7b77ae063767be248339f581a7651749e"},{"id":"func/UseCases.start","name":"UseCases.start","line":56,"end_line":136,"hash":"3207d2a7848465e421e0bdc61719cf4aa61b23e1dcdf751af087f13e6dc984cb"}]}
// mutate4javascript-manifest-end
