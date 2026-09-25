/*
  Use cases for psf-memo-db.
*/

import ListRecentProfiles from './list-recent-profiles.js'
import GetNewestQualifyingPost from './get-newest-qualifying-post.js'
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
    this.getNewestQualifyingPost = null
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

    this.getNewestQualifyingPost = new GetNewestQualifyingPost({
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
// {"version":1,"tested_at":"2026-09-25T17:20:25.115Z","module_hash":"eade7a728ece677096e0baea547b25ade73573cec826af82778be9dc929d335f","functions":[{"id":"func/UseCases.constructor","name":"UseCases.constructor","line":27,"end_line":56,"hash":"b7862f883b68e8f12b8a1ad4f51da9639e47e673aa5d7e7c4812bb70b75193df"},{"id":"func/UseCases.start","name":"UseCases.start","line":58,"end_line":142,"hash":"cc865baafc13cb726926b4742e7c0fe299e7807f3e22df6df4e4fa7992eb2319"}]}
// mutate4javascript-manifest-end
