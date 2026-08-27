/*
  Shared construction and execution contract for the follow list use cases
  (list-following, list-followers).

  Both follow list use cases validate a single address field, call the matching
  FollowQuery list method, and return that address alongside the result list.
  Centralizing this removes the per-class constructor and execute boilerplate
  that the two endpoints previously duplicated. Construction validation is
  delegated to ListUseCase.
*/

import { ListUseCase } from './use-case.js'

export class FollowListUseCase extends ListUseCase {
  constructor (localConfig, { useCaseName, adapterMethod, addrField, resultField }) {
    super(localConfig, { useCaseName, adapterName: 'followQuery' })
    this.addrField = addrField
    this.resultField = resultField
    this._list = this.adapters.followQuery[adapterMethod].bind(this.adapters.followQuery)
  }

  async execute (inObj = {}) {
    const addr = inObj[this.addrField]
    if (!addr || typeof addr !== 'string') {
      throw new Error(`${this.addrField} is required`)
    }
    const list = await this._list(addr)
    return { [this.addrField]: addr, [this.resultField]: list }
  }
}
