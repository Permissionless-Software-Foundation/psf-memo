/*
  Use case: report whether one address mutes another.

  Returns { muterAddr, muteeAddr, muted: boolean }.
*/

import { ListUseCase } from './lib/use-case.js'

class MuteState extends ListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, { useCaseName: 'MuteState', adapterName: 'muteQuery' })
  }

  async execute (inObj = {}) {
    const { muterAddr, muteeAddr } = inObj
    if (!muterAddr || typeof muterAddr !== 'string') {
      throw new Error('muterAddr is required')
    }
    if (!muteeAddr || typeof muteeAddr !== 'string') {
      throw new Error('muteeAddr is required')
    }

    const muted = await this.adapters.muteQuery.isMuted(muterAddr, muteeAddr)

    return { muterAddr, muteeAddr, muted }
  }
}

export default MuteState

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:29:04.639Z","module_hash":"0e37ef99c98cac6f23c11f10e4d9624ce6592d5842aa27b4ddebd69e0510a942","functions":[{"id":"func/MuteState.constructor","name":"MuteState.constructor","line":10,"end_line":12,"hash":"bf68be0e0fe9b7940cdcd450edd9e41a27e9bcc42f69a1d691461fd3f5ba5c9a"},{"id":"func/MuteState.execute","name":"MuteState.execute","line":14,"end_line":26,"hash":"0ff800d8e1f5c3a0fd25aa51aff6346eed3928739da7643071c12e4c02212399"}]}
// mutate4javascript-manifest-end
