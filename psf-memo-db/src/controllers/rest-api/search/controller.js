/*
  REST API controller for /search routes.
*/

import wlogger from '../../../adapters/wlogger.js'

class SearchRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Search REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Search REST Controller.')
    }

    this.search = this.search.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in search controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
  }

  /**
   * @api {get} /search Search posts and profiles
   * @apiPermission public
   * @apiName Search
   * @apiGroup REST Search
   *
   * @apiDescription Searches top-level posts and profiles by case-insensitive
   * substring match. Empty queries and queries with no matches return an empty
   * result set rather than an error.
   *
   * @apiQuery {String} q Search query
   * @apiQuery {Number} [limit=100] Page size (max 100)
   * @apiQuery {Number} [offset=0] Number of results to skip after sorting
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/search?q=hello&limit=50&offset=0"
   *
   * @apiSuccess {Object[]} posts Array of matching post objects
   * @apiSuccess {Object[]} profiles Array of matching profile objects
   * @apiSuccess {Object} pagination Pagination metadata
   */
  async search (ctx) {
    try {
      const { q, limit, offset } = ctx.query
      ctx.body = await this.useCases.searchAll.execute({ q, limit, offset })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default SearchRESTControllerLib
