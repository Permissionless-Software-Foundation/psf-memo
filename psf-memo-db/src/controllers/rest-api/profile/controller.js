/*
  REST API controller for /profile routes.
*/

import wlogger from '../../../adapters/wlogger.js'

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
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in profile controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
  }

  /**
   * @api {get} /profile/recent List recent profiles
   * @apiPermission public
   * @apiName GetRecentProfiles
   * @apiGroup REST Profile
   *
   * @apiDescription Returns profiles sorted by block height (newest first), with seen timestamp as tie-breaker.
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
}

export default ProfileRESTControllerLib
