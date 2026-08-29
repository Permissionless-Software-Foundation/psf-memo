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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T15:29:31.872Z","module_hash":"754b83cf1a4999e989084ba332d88924472370a14df989910d85bcea04deb001","functions":[{"id":"func/SearchRESTControllerLib.constructor","name":"SearchRESTControllerLib.constructor","line":8,"end_line":20,"hash":"75f8c48a39c4449f5b8c8a455d1bc6cdcd762fb035018f75b5e808f093c70c7b"},{"id":"func/SearchRESTControllerLib.handleError","name":"SearchRESTControllerLib.handleError","line":22,"end_line":29,"hash":"d8a071b5d797e24bacd19f63ca74b8eda35dc8d1f4bed97b9e5d37af7bee6831"},{"id":"func/SearchRESTControllerLib.search","name":"SearchRESTControllerLib.search","line":52,"end_line":59,"hash":"814f10f06f8406a61e59aa3678794414a41e8ddecd9693f5c3fa92242349722e"}]}
// mutate4javascript-manifest-end
