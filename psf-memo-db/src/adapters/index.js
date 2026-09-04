/*
  Top-level adapters for psf-memo-db.
*/

import LevelDb from './level-db.js'
import DbBackup from './db-backup.js'
import ProfileQuery from './profile-query.js'
import PostQuery from './post-query.js'
import FollowQuery from './follow-query.js'
import MuteQuery from './mute-query.js'
import TopicQuery from './topic-query.js'
import PollQuery from './poll-query.js'
import SearchQuery from './search-query.js'
import NotificationsQuery from './notifications-query.js'

class Adapters {
  constructor () {
    this.levelDb = new LevelDb()
    this.openDatabases = this.openDatabases.bind(this)
    this.start = this.start.bind(this)
  }

  openDatabases () {
    this.levelDb.ensureDirectories()
    const level = this.levelDb.openDbs()
    this.level = level
    this.dbBackup = new DbBackup(level)
    this.profileQuery = new ProfileQuery({
      profilesDb: level.profilesDb
    })
    // muteQuery must be constructed before postQuery: downstream adapters read
    // this.muteQuery at construction time, so declaring postQuery first would
    // pass an undefined muteQuery and silently disable recent-feed filtering.
    this.muteQuery = new MuteQuery({
      mutesDb: level.mutesDb
    })
    this.postQuery = new PostQuery({
      postsDb: level.postsDb,
      postHeightsDb: level.postHeightsDb,
      addrPostHeightsDb: level.addrPostHeightsDb,
      postParentsDb: level.postParentsDb,
      postChildrenDb: level.postChildrenDb,
      likesDb: level.likesDb,
      postLikesDb: level.postLikesDb,
      muteQuery: this.muteQuery
    })
    this.followQuery = new FollowQuery({
      followsDb: level.followsDb
    })
    this.topicQuery = new TopicQuery({
      roomsDb: level.roomsDb,
      postsDb: level.postsDb,
      muteQuery: this.muteQuery
    })
    this.pollQuery = new PollQuery({
      pollsDb: level.pollsDb,
      pollOptionsDb: level.pollOptionsDb,
      pollVotesDb: level.pollVotesDb
    })
    this.searchQuery = new SearchQuery({
      postsDb: level.postsDb,
      postParentsDb: level.postParentsDb,
      namesDb: level.namesDb,
      profilesDb: level.profilesDb,
      muteQuery: this.muteQuery
    })
    this.notificationsQuery = new NotificationsQuery({
      postsDb: level.postsDb,
      postParentsDb: level.postParentsDb,
      postChildrenDb: level.postChildrenDb,
      likesDb: level.likesDb,
      postLikesDb: level.postLikesDb,
      followsDb: level.followsDb,
      muteQuery: this.muteQuery
    })
    return true
  }

  async start () {
    this.openDatabases()
    console.log('Adapter libraries initialized.')
    return true
  }
}

export default Adapters

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T20:24:31.696Z","module_hash":"99e2c2c57d6bdf578234a9920a05afd2d8bce8d9d79b233b42cf89c15e4fa1b8","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":17,"end_line":21,"hash":"065fc13eb85e8f884084eb672e5bf38175fb8305e576484804398dd902133c40"},{"id":"func/Adapters.openDatabases","name":"Adapters.openDatabases","line":23,"end_line":77,"hash":"09ed690b76a13da1e9ba1ee17e5e7fe481f207d1ecc149492c884f0ee45f3b83"},{"id":"func/Adapters.start","name":"Adapters.start","line":79,"end_line":83,"hash":"f9e62a9199f0259f5c22913625e6e497548b3887cc24871bba475e73e52b3750"}]}
// mutate4javascript-manifest-end
