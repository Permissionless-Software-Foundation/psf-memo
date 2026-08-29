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
// {"version":1,"tested_at":"2026-08-28T23:02:23.414Z","module_hash":"b21f1e3f06db5dd67606fbc7021677bca4d9db8e900464185e89de2d1c2a61f1","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":14,"end_line":18,"hash":"065fc13eb85e8f884084eb672e5bf38175fb8305e576484804398dd902133c40"},{"id":"func/Adapters.openDatabases","name":"Adapters.openDatabases","line":20,"end_line":50,"hash":"6666e105f384adb9885d102b05b1be0f5b9885592c9ff1f8db34843ec351be01"},{"id":"func/Adapters.start","name":"Adapters.start","line":52,"end_line":56,"hash":"f9e62a9199f0259f5c22913625e6e497548b3887cc24871bba475e73e52b3750"}]}
// mutate4javascript-manifest-end
