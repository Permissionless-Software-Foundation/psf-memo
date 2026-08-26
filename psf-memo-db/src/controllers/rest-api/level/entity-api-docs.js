/*
  apidoc blocks for generic /level entity CRUD routes.
  Handlers are generated from ENTITY_CONFIG in crud-handlers.js.
*/

/**
 * @apiDefine LevelPublic
 * @apiPermission public
 */

/**
 * @apiDefine PostDataFields
 * @apiBody {String} postData.addr Author cash address
 * @apiBody {String} postData.text Post or reply message text
 * @apiBody {Number} postData.seen Unix epoch milliseconds
 * @apiBody {Number} postData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/post Create post record
 * @apiName CreateLevelPost
 * @apiGroup Level Post
 * @apiUse LevelPublic
 *
 * @apiDescription Create or overwrite a post document keyed by transaction id.
 *
 * @apiBody {String} txid Post transaction id (key)
 * @apiUse PostDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/post \
 *   -d '{"txid":"abc...","postData":{"addr":"bitcoincash:q...","text":"hello","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/post/:txid Get post record
 * @apiName GetLevelPost
 * @apiGroup Level Post
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Post transaction id
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/post/abc...
 *
 * @apiSuccess {String} addr Author cash address
 * @apiSuccess {String} text Post text
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/post/:txid Update post record
 * @apiName UpdateLevelPost
 * @apiGroup Level Post
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Post transaction id
 * @apiUse PostDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/post/abc... \
 *   -d '{"postData":{"addr":"bitcoincash:q...","text":"updated","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/post/:txid Delete post record
 * @apiName DeleteLevelPost
 * @apiGroup Level Post
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Post transaction id
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/post/abc...
 *
 * @apiSuccess {String} txid Transaction id deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine ReplyLinkFields
 * @apiBody {String} parentData.parentTxid Parent post transaction id
 * @apiBody {String} parentData.childTxid Reply transaction id
 * @apiBody {Number} parentData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/postparent Create reply parent link
 * @apiName CreateLevelPostParent
 * @apiGroup Level Post Parent
 * @apiUse LevelPublic
 *
 * @apiDescription Store the forward link from a reply transaction to its parent post. Keyed by child (reply) txid.
 *
 * @apiBody {String} txid Reply transaction id (key)
 * @apiUse ReplyLinkFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/postparent \
 *   -d '{"txid":"child...","parentData":{"parentTxid":"parent...","childTxid":"child...","blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Reply transaction id written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/postparent/:txid Get reply parent link
 * @apiName GetLevelPostParent
 * @apiGroup Level Post Parent
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Reply transaction id
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/postparent/child...
 *
 * @apiSuccess {String} parentTxid Parent post transaction id
 * @apiSuccess {String} childTxid Reply transaction id
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/postparent/:txid Update reply parent link
 * @apiName UpdateLevelPostParent
 * @apiGroup Level Post Parent
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Reply transaction id
 * @apiUse ReplyLinkFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/postparent/child... \
 *   -d '{"parentData":{"parentTxid":"parent...","childTxid":"child...","blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Reply transaction id updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/postparent/:txid Delete reply parent link
 * @apiName DeleteLevelPostParent
 * @apiGroup Level Post Parent
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Reply transaction id
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/postparent/child...
 *
 * @apiSuccess {String} txid Reply transaction id deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine ChildLinkFields
 * @apiBody {String} childData.parentTxid Parent post transaction id
 * @apiBody {String} childData.childTxid Reply transaction id
 * @apiBody {Number} childData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/postchild Create reply child link
 * @apiName CreateLevelPostChild
 * @apiGroup Level Post Child
 * @apiUse LevelPublic
 *
 * @apiDescription Store the reverse link from a parent post to a reply. Keyed by parentTxid:childTxid composite key.
 *
 * @apiBody {String} key Composite key parentTxid:childTxid
 * @apiUse ChildLinkFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/postchild \
 *   -d '{"key":"parent...:child...","childData":{"parentTxid":"parent...","childTxid":"child...","blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/postchild/:key Get reply child link
 * @apiName GetLevelPostChild
 * @apiGroup Level Post Child
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key parentTxid:childTxid
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/postchild/parent...:child...
 *
 * @apiSuccess {String} parentTxid Parent post transaction id
 * @apiSuccess {String} childTxid Reply transaction id
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/postchild/:key Update reply child link
 * @apiName UpdateLevelPostChild
 * @apiGroup Level Post Child
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key parentTxid:childTxid
 * @apiUse ChildLinkFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/postchild/parent...:child... \
 *   -d '{"childData":{"parentTxid":"parent...","childTxid":"child...","blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/postchild/:key Delete reply child link
 * @apiName DeleteLevelPostChild
 * @apiGroup Level Post Child
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key parentTxid:childTxid
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/postchild/parent...:child...
 *
 * @apiSuccess {String} key Composite key deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine LikeDataFields
 * @apiBody {String} likeData.addr Liker cash address
 * @apiBody {String} likeData.postTxid Liked post transaction id
 * @apiBody {Number} likeData.seen Unix epoch milliseconds
 * @apiBody {Number} [likeData.tip] Tip amount in satoshis
 * @apiBody {Number} likeData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/like Create like record
 * @apiName CreateLevelLike
 * @apiGroup Level Like
 * @apiUse LevelPublic
 *
 * @apiBody {String} txid Like transaction id (key)
 * @apiUse LikeDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/like \
 *   -d '{"txid":"abc...","likeData":{"addr":"bitcoincash:q...","postTxid":"post...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Like transaction id written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/like/:txid Get like record
 * @apiName GetLevelLike
 * @apiGroup Level Like
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Like transaction id
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/like/abc...
 *
 * @apiSuccess {String} addr Liker cash address
 * @apiSuccess {String} postTxid Liked post transaction id
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} [tip] Tip amount in satoshis
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/like/:txid Update like record
 * @apiName UpdateLevelLike
 * @apiGroup Level Like
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Like transaction id
 * @apiUse LikeDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/like/abc... \
 *   -d '{"likeData":{"addr":"bitcoincash:q...","postTxid":"post...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Like transaction id updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/like/:txid Delete like record
 * @apiName DeleteLevelLike
 * @apiGroup Level Like
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Like transaction id
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/like/abc...
 *
 * @apiSuccess {String} txid Like transaction id deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine NameDataFields
 * @apiBody {String} nameData.name Display name
 * @apiBody {String} nameData.txid Provenance transaction id
 * @apiBody {String} nameData.addr Cash address
 * @apiBody {Number} nameData.seen Unix epoch milliseconds
 * @apiBody {Number} nameData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/name Create name record
 * @apiName CreateLevelName
 * @apiGroup Level Name
 * @apiUse LevelPublic
 *
 * @apiBody {String} addr Cash address (key)
 * @apiUse NameDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/name \
 *   -d '{"addr":"bitcoincash:q...","nameData":{"name":"memo","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/name/:addr Get name record
 * @apiName GetLevelName
 * @apiGroup Level Name
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/name/bitcoincash:q...
 *
 * @apiSuccess {String} name Display name
 * @apiSuccess {String} txid Provenance transaction id
 * @apiSuccess {String} addr Cash address
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/name/:addr Update name record
 * @apiName UpdateLevelName
 * @apiGroup Level Name
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 * @apiUse NameDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/name/bitcoincash:q... \
 *   -d '{"nameData":{"name":"memo","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/name/:addr Delete name record
 * @apiName DeleteLevelName
 * @apiGroup Level Name
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/name/bitcoincash:q...
 *
 * @apiSuccess {String} addr Cash address deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine ProfileDataFields
 * @apiBody {String} profileData.text Profile message text
 * @apiBody {String} profileData.txid Provenance transaction id
 * @apiBody {String} profileData.addr Cash address
 * @apiBody {Number} profileData.seen Unix epoch milliseconds
 * @apiBody {Number} profileData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/profile Create profile record
 * @apiName CreateLevelProfile
 * @apiGroup Level Profile
 * @apiUse LevelPublic
 *
 * @apiBody {String} addr Cash address (key)
 * @apiUse ProfileDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/profile \
 *   -d '{"addr":"bitcoincash:q...","profileData":{"text":"my bio","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/profile/:addr Get profile record
 * @apiName GetLevelProfile
 * @apiGroup Level Profile
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/profile/bitcoincash:q...
 *
 * @apiSuccess {String} text Profile message text
 * @apiSuccess {String} txid Provenance transaction id
 * @apiSuccess {String} addr Cash address
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/profile/:addr Update profile record
 * @apiName UpdateLevelProfile
 * @apiGroup Level Profile
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 * @apiUse ProfileDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/profile/bitcoincash:q... \
 *   -d '{"profileData":{"text":"updated bio","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/profile/:addr Delete profile record
 * @apiName DeleteLevelProfile
 * @apiGroup Level Profile
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/profile/bitcoincash:q...
 *
 * @apiSuccess {String} addr Cash address deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine ProfilePicDataFields
 * @apiBody {String} profilePicData.url Avatar image URL
 * @apiBody {String} profilePicData.txid Provenance transaction id
 * @apiBody {String} profilePicData.addr Cash address
 * @apiBody {Number} profilePicData.seen Unix epoch milliseconds
 * @apiBody {Number} profilePicData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/profilepic Create profile picture record
 * @apiName CreateLevelProfilePic
 * @apiGroup Level Profile Pic
 * @apiUse LevelPublic
 *
 * @apiBody {String} addr Cash address (key)
 * @apiUse ProfilePicDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/profilepic \
 *   -d '{"addr":"bitcoincash:q...","profilePicData":{"url":"https://example.com/pic.jpg","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/profilepic/:addr Get profile picture record
 * @apiName GetLevelProfilePic
 * @apiGroup Level Profile Pic
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/profilepic/bitcoincash:q...
 *
 * @apiSuccess {String} url Avatar image URL
 * @apiSuccess {String} txid Provenance transaction id
 * @apiSuccess {String} addr Cash address
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/profilepic/:addr Update profile picture record
 * @apiName UpdateLevelProfilePic
 * @apiGroup Level Profile Pic
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 * @apiUse ProfilePicDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/profilepic/bitcoincash:q... \
 *   -d '{"profilePicData":{"url":"https://example.com/pic.jpg","txid":"abc...","addr":"bitcoincash:q...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} addr Cash address updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/profilepic/:addr Delete profile picture record
 * @apiName DeleteLevelProfilePic
 * @apiGroup Level Profile Pic
 * @apiUse LevelPublic
 *
 * @apiParam {String} addr Cash address
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/profilepic/bitcoincash:q...
 *
 * @apiSuccess {String} addr Cash address deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine FollowDataFields
 * @apiBody {String} followData.followerAddr Follower cash address
 * @apiBody {String} followData.followeePkHash Followee public key hash (hex)
 * @apiBody {Boolean} followData.unfollow True for unfollow actions
 * @apiBody {String} followData.txid Provenance transaction id
 * @apiBody {Number} followData.seen Unix epoch milliseconds
 * @apiBody {Number} followData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/follow Create follow record
 * @apiName CreateLevelFollow
 * @apiGroup Level Follow
 * @apiUse LevelPublic
 *
 * @apiDescription Store a follow or unfollow edge. Key is followerAddr:followeePkHash.
 *
 * @apiBody {String} key Composite key followerAddr:followeePkHash
 * @apiUse FollowDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/follow \
 *   -d '{"key":"bitcoincash:q...:abc123","followData":{"followerAddr":"bitcoincash:q...","followeePkHash":"abc123","unfollow":false,"txid":"tx...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/follow/:key Get follow record
 * @apiName GetLevelFollow
 * @apiGroup Level Follow
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key followerAddr:followeePkHash
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/follow/bitcoincash:q...:abc123
 *
 * @apiSuccess {String} followerAddr Follower cash address
 * @apiSuccess {String} followeePkHash Followee public key hash
 * @apiSuccess {Boolean} unfollow True for unfollow actions
 * @apiSuccess {String} txid Provenance transaction id
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/follow/:key Update follow record
 * @apiName UpdateLevelFollow
 * @apiGroup Level Follow
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key followerAddr:followeePkHash
 * @apiUse FollowDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/follow/bitcoincash:q...:abc123 \
 *   -d '{"followData":{"followerAddr":"bitcoincash:q...","followeePkHash":"abc123","unfollow":true,"txid":"tx...","seen":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/follow/:key Delete follow record
 * @apiName DeleteLevelFollow
 * @apiGroup Level Follow
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key followerAddr:followeePkHash
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/follow/bitcoincash:q...:abc123
 *
 * @apiSuccess {String} key Composite key deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine RoomDataFields
 * @apiBody {String} roomData.room Topic or room name
 * @apiBody {String} roomData.txid Provenance transaction id
 * @apiBody {Number} roomData.seen Unix epoch milliseconds
 * @apiBody {String} roomData.type Record type (e.g. "post")
 * @apiBody {Number} roomData.blockHeight Block height when indexed
 * @apiBody {String} [roomData.addr] Author cash address for topic follows
 */

/**
 * @api {post} /level/room Create room record
 * @apiName CreateLevelRoom
 * @apiGroup Level Room
 * @apiUse LevelPublic
 *
 * @apiDescription Store a topic post or topic follow index entry. Key is roomName:txid.
 *
 * @apiBody {String} key Composite key roomName:txid
 * @apiUse RoomDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/room \
 *   -d '{"key":"general:abc...","roomData":{"room":"general","txid":"abc...","seen":1500000000000,"type":"post","blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/room/:key Get room record
 * @apiName GetLevelRoom
 * @apiGroup Level Room
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key roomName:txid
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/room/general:abc...
 *
 * @apiSuccess {String} room Topic or room name
 * @apiSuccess {String} txid Provenance transaction id
 * @apiSuccess {Number} seen Unix epoch milliseconds
 * @apiSuccess {String} type Record type
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/room/:key Update room record
 * @apiName UpdateLevelRoom
 * @apiGroup Level Room
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key roomName:txid
 * @apiUse RoomDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/room/general:abc... \
 *   -d '{"roomData":{"room":"general","txid":"abc...","seen":1500000000000,"type":"post","blockHeight":600000}}'
 *
 * @apiSuccess {String} key Composite key updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/room/:key Delete room record
 * @apiName DeleteLevelRoom
 * @apiGroup Level Room
 * @apiUse LevelPublic
 *
 * @apiParam {String} key Composite key roomName:txid
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/room/general:abc...
 *
 * @apiSuccess {String} key Composite key deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine ProcessErrorDataFields
 * @apiBody {String} errorData.error Error message
 * @apiBody {Number} errorData.ts Unix epoch milliseconds when logged
 * @apiBody {Number} errorData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/processerror Create process error record
 * @apiName CreateLevelProcessError
 * @apiGroup Level Process Error
 * @apiUse LevelPublic
 *
 * @apiDescription Store a validation or parse failure for a memo transaction.
 *
 * @apiBody {String} txid Failed transaction id (key)
 * @apiUse ProcessErrorDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/processerror \
 *   -d '{"txid":"abc...","errorData":{"error":"invalid reply push data count 2","ts":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/processerror/:txid Get process error record
 * @apiName GetLevelProcessError
 * @apiGroup Level Process Error
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Failed transaction id
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/processerror/abc...
 *
 * @apiSuccess {String} error Error message
 * @apiSuccess {Number} ts Unix epoch milliseconds when logged
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/processerror/:txid Update process error record
 * @apiName UpdateLevelProcessError
 * @apiGroup Level Process Error
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Failed transaction id
 * @apiUse ProcessErrorDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/processerror/abc... \
 *   -d '{"errorData":{"error":"invalid reply push data count 2","ts":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/processerror/:txid Delete process error record
 * @apiName DeleteLevelProcessError
 * @apiGroup Level Process Error
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Failed transaction id
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/processerror/abc...
 *
 * @apiSuccess {String} txid Transaction id deleted
 * @apiSuccess {Boolean} success true
 */

/**
 * @apiDefine PtxDataFields
 * @apiBody {Number} ptxData.processedAt Unix epoch milliseconds when processed
 * @apiBody {Number} ptxData.blockHeight Block height when indexed
 */

/**
 * @api {post} /level/ptx Create processed transaction marker
 * @apiName CreateLevelPtx
 * @apiGroup Level Processed Tx
 * @apiUse LevelPublic
 *
 * @apiDescription Mark a memo transaction as processed for idempotency.
 *
 * @apiBody {String} txid Transaction id (key)
 * @apiUse PtxDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X POST localhost:5021/level/ptx \
 *   -d '{"txid":"abc...","ptxData":{"processedAt":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id written
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {get} /level/ptx/:txid Get processed transaction marker
 * @apiName GetLevelPtx
 * @apiGroup Level Processed Tx
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Transaction id
 *
 * @apiExample Example usage:
 * curl -X GET localhost:5021/level/ptx/abc...
 *
 * @apiSuccess {Number} processedAt Unix epoch milliseconds when processed
 * @apiSuccess {Number} blockHeight Block height when indexed
 */

/**
 * @api {put} /level/ptx/:txid Update processed transaction marker
 * @apiName UpdateLevelPtx
 * @apiGroup Level Processed Tx
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Transaction id
 * @apiUse PtxDataFields
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/ptx/abc... \
 *   -d '{"ptxData":{"processedAt":1500000000000,"blockHeight":600000}}'
 *
 * @apiSuccess {String} txid Transaction id updated
 * @apiSuccess {Boolean} success true
 */

/**
 * @api {delete} /level/ptx/:txid Delete processed transaction marker
 * @apiName DeleteLevelPtx
 * @apiGroup Level Processed Tx
 * @apiUse LevelPublic
 *
 * @apiParam {String} txid Transaction id
 *
 * @apiExample Example usage:
 * curl -X DELETE localhost:5021/level/ptx/abc...
 *
 * @apiSuccess {String} txid Transaction id deleted
 * @apiSuccess {Boolean} success true
 */

export {}
