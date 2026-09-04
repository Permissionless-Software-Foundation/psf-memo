/*
  Shared base for simple paginated page controllers.

  A paginated page loads a single list from a MemoDb method, stores the list
  and its pagination, and reports whether more items can be loaded. Subclasses
  supply the memoDb method name, the result list field, and the error message
  for the missing-client guard, then add their own item finder.
*/

class PaginatedPage {
  constructor (deps = {}, { listField, loadMethod, errorMessage }) {
    this.memoDb = deps.memoDb || null
    this[listField] = []
    this.pagination = null
    this._listField = listField
    this._loadMethod = loadMethod
    this._errorMessage = errorMessage
  }

  async load ({ limit = 50, offset = 0 } = {}) {
    if (!this.memoDb) {
      throw new Error(this._errorMessage)
    }

    const data = await this.memoDb[this._loadMethod]({ limit, offset })
    this[this._listField] = data[this._listField] || []
    this.pagination = data.pagination || null

    return { [this._listField]: this[this._listField], pagination: this.pagination }
  }

  canLoadMore () {
    return this.pagination?.hasMore ?? false
  }
}

module.exports = PaginatedPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T17:08:23.730Z","module_hash":"6ba99f826fd1a2bd4a090bedaabe3a8497d4ebe3694138b26090fa5c2f1f6efb","functions":[{"id":"func/PaginatedPage.constructor","name":"PaginatedPage.constructor","line":11,"end_line":18,"hash":"14d764e7220271146f33020326072e2ebb653e1a1372360348e552056d21e0c8"},{"id":"func/PaginatedPage.load","name":"PaginatedPage.load","line":20,"end_line":30,"hash":"b9c43d761b25e202dfbc16beee7ab90b06ee75dcb9ba0799ee014d513b2e9a5c"},{"id":"func/PaginatedPage.canLoadMore","name":"PaginatedPage.canLoadMore","line":32,"end_line":34,"hash":"634983bcc6bbe560daad8326db0dd4bf31d5cb9e45c40112565351dceaf8e5d5"}]}
// mutate4javascript-manifest-end
