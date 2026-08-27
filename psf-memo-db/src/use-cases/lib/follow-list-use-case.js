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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T18:16:27.234Z","module_hash":"1424c15ec8acd2179412ef5b347107746ef1e035a47fc1fac595e96c194526f8","functions":[{"id":"func/FollowListUseCase.constructor","name":"FollowListUseCase.constructor","line":15,"end_line":20,"hash":"f5f3b2832eb47baeb416b6b36122163d7479444e82f471a7d9b34f800639208c"},{"id":"func/FollowListUseCase.execute","name":"FollowListUseCase.execute","line":22,"end_line":29,"hash":"3d9258e7bb03192db5b56eac38819604dfdc43ee63b47cc6445754d36ab1848f"}]}
// mutate4javascript-manifest-end
