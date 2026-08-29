/*
  Generic LevelDB CRUD handlers for /level routes.
*/

export function makeCrudHandlers ({ dbProp, keyParam, bodyIdField, bodyDataField, label }) {
  return {
    async get (ctx, adapters) {
      const key = ctx.params[keyParam]
      const result = await adapters.level[dbProp].get(key)
      ctx.body = result
    },

    async create (ctx, adapters) {
      const key = ctx.request.body[bodyIdField]
      const data = ctx.request.body[bodyDataField]
      await adapters.level[dbProp].put(key, data)
      ctx.body = { [bodyIdField]: key, success: true }
    },

    async update (ctx, adapters) {
      const key = ctx.params[keyParam]
      const data = ctx.request.body[bodyDataField]
      await adapters.level[dbProp].put(key, data)
      ctx.body = { [keyParam]: key, success: true }
    },

    async delete (ctx, adapters) {
      const key = ctx.params[keyParam]
      await adapters.level[dbProp].del(key)
      ctx.body = { [keyParam]: key, success: true }
    },

    label
  }
}

export const ENTITY_CONFIG = [
  { route: 'post', dbProp: 'postsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'postData' },
  { route: 'postheight', dbProp: 'postHeightsDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'postHeightData' },
  { route: 'addrpostheight', dbProp: 'addrPostHeightsDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'addrPostHeightData' },
  { route: 'postparent', dbProp: 'postParentsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'parentData' },
  { route: 'postchild', dbProp: 'postChildrenDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'childData' },
  { route: 'like', dbProp: 'likesDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'likeData' },
  { route: 'postlike', dbProp: 'postLikesDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'postLikeData' },
  { route: 'name', dbProp: 'namesDb', keyParam: 'addr', bodyIdField: 'addr', bodyDataField: 'nameData' },
  { route: 'profile', dbProp: 'profilesDb', keyParam: 'addr', bodyIdField: 'addr', bodyDataField: 'profileData' },
  { route: 'profilepic', dbProp: 'profilePicsDb', keyParam: 'addr', bodyIdField: 'addr', bodyDataField: 'profilePicData' },
  { route: 'follow', dbProp: 'followsDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'followData' },
  { route: 'room', dbProp: 'roomsDb', keyParam: 'key', bodyIdField: 'key', bodyDataField: 'roomData' },
  { route: 'processerror', dbProp: 'processErrorsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'errorData' },
  { route: 'ptx', dbProp: 'ptxsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'ptxData' },
  { route: 'poll', dbProp: 'pollsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'pollData' },
  { route: 'polloption', dbProp: 'pollOptionsDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'optionData' },
  { route: 'pollvote', dbProp: 'pollVotesDb', keyParam: 'txid', bodyIdField: 'txid', bodyDataField: 'voteData' }
]

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-28T23:03:44.574Z","module_hash":"af3658a3d322d18b162ddedfbdf71a121b304b9e813c86a2bc7db7ad441c2f05","functions":[{"id":"func/makeCrudHandlers","name":"makeCrudHandlers","line":5,"end_line":35,"hash":"133b135aa115c058291b6df4a0b6b15152dde83c3163890e0eab0c3b018f8d4d"}]}
// mutate4javascript-manifest-end
