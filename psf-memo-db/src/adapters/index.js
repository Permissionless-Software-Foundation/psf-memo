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
// {"version":1,"tested_at":"2026-09-18T17:38:46.670Z","module_hash":"e13818a9da05adfdc35ba7721caab3c70666b4b1b2aa374988f57ad760ee6322","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":17,"end_line":22,"hash":"d5d1fd454ddfa112378f278773b65be5cb39aab75473dd57c04c9a385de1aa58"},{"id":"func/Adapters.openDatabases","name":"Adapters.openDatabases","line":24,"end_line":82,"hash":"e5e55b93a3aa994d5f938ed3b08c59f82fda1e98029d80ec566faec1d43d6d6c"},{"id":"func/Adapters.start","name":"Adapters.start","line":84,"end_line":88,"hash":"f9e62a9199f0259f5c22913625e6e497548b3887cc24871bba475e73e52b3750"}]}
// mutate4javascript-manifest-end
