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
  constructor (localConfig = {}) {
    this.notificationBlockWindow = localConfig.notificationBlockWindow
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
      profilesDb: level.profilesDb,
      namesDb: level.namesDb,
      profilePicsDb: level.profilePicsDb,
      profileRecencyDb: level.profileRecencyDb,
      addrPostHeightsDb: level.addrPostHeightsDb,
      postsDb: level.postsDb,
      postParentsDb: level.postParentsDb,
      pollsDb: level.pollsDb,
      statusDb: level.statusDb
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
      topicSummariesDb: level.topicSummariesDb,
      topicRecencyDb: level.topicRecencyDb,
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
      addrPostHeightsDb: level.addrPostHeightsDb,
      postChildrenDb: level.postChildrenDb,
      postLikesDb: level.postLikesDb,
      likesDb: level.likesDb,
      followeeHeightsDb: level.followeeHeightsDb,
      statusDb: level.statusDb,
      muteQuery: this.muteQuery,
      notificationBlockWindow: this.notificationBlockWindow
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
// {"version":1,"tested_at":"2026-09-20T21:56:16.308Z","module_hash":"7e2f08e8c4f5cbe9c883e29212a6391cd63a20f0875c29c192a0f078e1363458","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":17,"end_line":22,"hash":"d5d1fd454ddfa112378f278773b65be5cb39aab75473dd57c04c9a385de1aa58"},{"id":"func/Adapters.openDatabases","name":"Adapters.openDatabases","line":24,"end_line":85,"hash":"ed9027f054515a862e5eeaaaf5a996975cad3c910f2cd4e486c369a0a0282fa6"},{"id":"func/Adapters.start","name":"Adapters.start","line":87,"end_line":91,"hash":"f9e62a9199f0259f5c22913625e6e497548b3887cc24871bba475e73e52b3750"}]}
// mutate4javascript-manifest-end
