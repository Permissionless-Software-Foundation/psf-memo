/*
  REST API controller for /profile routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

class ProfileRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Profile REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Profile REST Controller.')
    }

    this.getRecentProfiles = this.getRecentProfiles.bind(this)
    this.getNewestQualifyingPost = this.getNewestQualifyingPost.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    handleControllerError(ctx, err, 'profile')
  }

  /**
   * @api {get} /profile/recent List recent profiles
   * @apiPermission public
   * @apiName GetRecentProfiles
   * @apiGroup REST Profile
   *
   * @apiDescription Returns profiles sorted by block height (newest first), with seen timestamp as tie-breaker. Each profile is joined with its address-keyed display name (names store) and avatar URL (profilePics store), reported as null when absent.
   *
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of profiles to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/profile/recent?limit=50&offset=0"
   *
   * @apiSuccess {Object[]} profiles Array of profile objects
   * @apiSuccess {String} profiles.addr Cash address
   * @apiSuccess {String} profiles.text Profile message text
   * @apiSuccess {String} profiles.name Display name from the names store, or null when absent
   * @apiSuccess {String} profiles.profilePicUrl Avatar URL from the profilePics store, or null when absent
   * @apiSuccess {String} profiles.txid Provenance transaction id
   * @apiSuccess {Number} profiles.seen Unix epoch milliseconds
   * @apiSuccess {Number} profiles.blockHeight Block height when indexed
   * @apiSuccess {Object} pagination Pagination metadata
   * @apiSuccess {Number} pagination.limit Page size used
   * @apiSuccess {Number} pagination.offset Offset used
   * @apiSuccess {Number} pagination.total Total matching profiles
   * @apiSuccess {Boolean} pagination.hasMore True if more pages exist
   */
  async getRecentProfiles (ctx) {
    try {
      const { limit, offset } = ctx.query
      ctx.body = await this.useCases.listRecentProfiles.execute({ limit, offset })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /profile/newest-post/:addr Newest qualifying post
   * @apiPermission public
   * @apiName GetNewestQualifyingPost
   * @apiGroup REST Profile
   *
   * @apiDescription Returns the newest confirmed qualifying post for one profile address, or an empty object when the address has no qualifying post. A qualifying post is a top-level post (0x6d02) or a topic message (0x6d0c); replies and poll creations do not qualify. Posts above the chain tip are unconfirmed and ignored. The newest confirmed post wins, with seen as the tie-breaker at equal heights.
   *
   * @apiParam {String} addr Cash address
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/profile/newest-post/bitcoincash%3Aqaddr-alice"
   *
   * @apiSuccess {String} addr Cash address, absent when there is no qualifying post
   * @apiSuccess {Number} blockHeight Block height of the newest confirmed qualifying post
   * @apiSuccess {Number} seen Unix epoch milliseconds of the newest confirmed qualifying post
   */
  async getNewestQualifyingPost (ctx) {
    try {
      const { addr } = ctx.params
      ctx.body = await this.useCases.getNewestQualifyingPost.execute({ addr })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default ProfileRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T17:17:56.959Z","module_hash":"8f29b9637f96e71551dc0c622bf0d71a6d6c367f09fec45b05f1f4fe2d7805c6","functions":[{"id":"func/ProfileRESTControllerLib.constructor","name":"ProfileRESTControllerLib.constructor","line":8,"end_line":21,"hash":"1dbd97121f672a98d6da36cf3bc11dade19f5467433f763af6a7421d4bdb47fb"},{"id":"func/ProfileRESTControllerLib.handleError","name":"ProfileRESTControllerLib.handleError","line":23,"end_line":25,"hash":"dd78b4827c34b435ec347deb58a5887eb2637f2178787abbad0ab1876b3aeeb5"},{"id":"func/ProfileRESTControllerLib.getRecentProfiles","name":"ProfileRESTControllerLib.getRecentProfiles","line":55,"end_line":62,"hash":"19def1b20db3c01af46d2984e3db108c0d2327f23e33f0b653b6b8b3311f83a7"},{"id":"func/ProfileRESTControllerLib.getNewestQualifyingPost","name":"ProfileRESTControllerLib.getNewestQualifyingPost","line":81,"end_line":88,"hash":"5736d56da2ca9376dedaa4818f2a73144c4dfee398d76d608add28137577e0ca"}]}
// mutate4javascript-manifest-end
