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
