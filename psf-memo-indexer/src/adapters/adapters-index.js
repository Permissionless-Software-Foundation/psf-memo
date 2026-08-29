/*
  Top-level adapters index.
*/

import StatusDb from './status-db.js'
import RPC from './rpc.js'
import Transaction from './transaction.js'
import ZMQ from './zmq.js'
import TxIndexerAdapter from './tx-indexer.js'
import DbCtrl from './backup-db.js'
import { createEntityDb } from './entity-db.js'

class Adapters {
  constructor (localConfig = {}) {
    this.statusDb = new StatusDb()
    this.rpc = new RPC()
    this.transaction = new Transaction(localConfig)
    this.zmq = new ZMQ()
    this.txIndexerAdapter = new TxIndexerAdapter()
    this.dbCtrl = new DbCtrl()

    this.postDb = createEntityDb('post', 'txid', 'postData')
    this.postHeightDb = createEntityDb('postheight', 'key', 'postHeightData')
    this.addrPostHeightDb = createEntityDb('addrpostheight', 'key', 'addrPostHeightData')
    this.postParentDb = createEntityDb('postparent', 'txid', 'parentData')
    this.postChildDb = createEntityDb('postchild', 'key', 'childData')
    this.likeDb = createEntityDb('like', 'txid', 'likeData')
    this.postLikeDb = createEntityDb('postlike', 'key', 'postLikeData')
    this.nameDb = createEntityDb('name', 'addr', 'nameData')
    this.profileDb = createEntityDb('profile', 'addr', 'profileData')
    this.profilePicDb = createEntityDb('profilepic', 'addr', 'profilePicData')
    this.followDb = createEntityDb('follow', 'key', 'followData')
    this.roomDb = createEntityDb('room', 'key', 'roomData')
    this.pollDb = createEntityDb('poll', 'txid', 'pollData')
    this.pollOptionDb = createEntityDb('polloption', 'txid', 'optionData')
    this.pollVoteDb = createEntityDb('pollvote', 'txid', 'voteData')
    this.processErrorDb = createEntityDb('processerror', 'txid', 'errorData')
    this.ptxDb = createEntityDb('ptx', 'txid', 'ptxData')

    this.initAdapters = this.initAdapters.bind(this)
  }

  async initAdapters () {
    console.log('Adapter libraries initialized.')
    return true
  }
}

export default Adapters

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:35:03.972Z","module_hash":"812d0c3cd8f63eb6c028112cd26891c3b9bc7a7bc1c22e97d96a153a590f1e44","functions":[{"id":"func/Adapters.constructor","name":"Adapters.constructor","line":14,"end_line":41,"hash":"17fe3057a44fa0f8a17ddbbc5ddb285e1d29bf651bae778ac87097196d34aab0"},{"id":"func/Adapters.initAdapters","name":"Adapters.initAdapters","line":43,"end_line":46,"hash":"e3fd321225d51de1199b7ea45e4c9ab323a474c6fe99252041271e45daa59650"}]}
// mutate4javascript-manifest-end
