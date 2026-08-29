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
  constructor (localConfig, { useCaseName, adapterMethod, addrField, resultField, adapterName = 'followQuery' }) {
    super(localConfig, { useCaseName, adapterName })
    this.addrField = addrField
    this.resultField = resultField
    this._list = this.adapters[adapterName][adapterMethod].bind(this.adapters[adapterName])
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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:30:18.194Z","module_hash":"24024ec5900b4097a6aa7aef2e5d4eb92834336ee99a7143ef59e3565b112029","functions":[{"id":"func/FollowListUseCase.constructor","name":"FollowListUseCase.constructor","line":15,"end_line":20,"hash":"3959516f05104386f09b2194feda32dd46038975dff2cfedf58b82da0bf08d10"},{"id":"func/FollowListUseCase.execute","name":"FollowListUseCase.execute","line":22,"end_line":29,"hash":"3d9258e7bb03192db5b56eac38819604dfdc43ee63b47cc6445754d36ab1848f"}]}
// mutate4javascript-manifest-end
