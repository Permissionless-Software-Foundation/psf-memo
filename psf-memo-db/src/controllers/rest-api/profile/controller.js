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
