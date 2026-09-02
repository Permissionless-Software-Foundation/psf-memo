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
    this.postQuery = new PostQuery({
      postsDb: level.postsDb,
      postHeightsDb: level.postHeightsDb,
      addrPostHeightsDb: level.addrPostHeightsDb,
      postParentsDb: level.postParentsDb,
      postChildrenDb: level.postChildrenDb,
      likesDb: level.likesDb,
      postLikesDb: level.postLikesDb
    })
    this.followQuery = new FollowQuery({
      followsDb: level.followsDb
    })
    this.muteQuery = new MuteQuery({
      mutesDb: level.mutesDb
    })
    this.topicQuery = new TopicQuery({
      roomsDb: level.roomsDb,
      postsDb: level.postsDb
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
      profilesDb: level.profilesDb
    })
    this.notificationsQuery = new NotificationsQuery({
      postsDb: level.postsDb,
      postParentsDb: level.postParentsDb,
      postChildrenDb: level.postChildrenDb,
      likesDb: level.likesDb,
      postLikesDb: level.postLikesDb,
      followsDb: level.followsDb
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
// {"version":1,"tested_at":"2026-08-29T03:34:22.589Z","module_hash":"7137b595886dd88a8e876e38126ab9abe106b5b0e1054092297f508fb757adc4","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":15,"end_line":19,"hash":"065fc13eb85e8f884084eb672e5bf38175fb8305e576484804398dd902133c40"},{"id":"func/Adapters.openDatabases","name":"Adapters.openDatabases","line":21,"end_line":54,"hash":"588b692236c37e0940c82f235d15be1a8640b4afa8bc2a0a06ada5026dd417f5"},{"id":"func/Adapters.start","name":"Adapters.start","line":56,"end_line":60,"hash":"f9e62a9199f0259f5c22913625e6e497548b3887cc24871bba475e73e52b3750"}]}
// mutate4javascript-manifest-end
