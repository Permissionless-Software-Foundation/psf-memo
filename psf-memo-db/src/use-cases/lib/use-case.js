/*
  Shared construction contract for list use cases.

  Each list use case validates that an adapters bundle is supplied and that the
  specific adapter it depends on is present, then binds its execute method.
  Centralizing this keeps construction validation identical across list
  endpoints and removes per-class constructor boilerplate.
*/

export class ListUseCase {
  constructor (localConfig = {}, { useCaseName, adapterName } = {}) {
    this.adapters = localConfig.adapters
    if (!this.adapters) {
      throw new Error(`Adapters required when instantiating ${useCaseName} use case.`)
    }
    if (!this.adapters[adapterName]) {
      throw new Error(`${adapterName} adapter required for ${useCaseName} use case.`)
    }
    this.execute = this.execute.bind(this)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-26T18:14:47.462Z","module_hash":"595f78478e9b0d12ecf176473430aafe51ed53ea16a69d66225cb448a91b119c","functions":[{"id":"func/ListUseCase.constructor","name":"ListUseCase.constructor","line":11,"end_line":20,"hash":"03c09b5cf853135ed7acd73f025878c78ee572891b73341ce54f3cac805d0cf6"}]}
// mutate4javascript-manifest-end
