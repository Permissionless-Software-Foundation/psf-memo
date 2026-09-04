/*
  REST API controller for /mute routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

class MuteRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Mute REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Mute REST Controller.')
    }

    this.getMuteState = this.getMuteState.bind(this)
    this.getMuted = this.getMuted.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    handleControllerError(ctx, err, 'mute')
  }

  /**
   * @api {get} /mute/state Check mute state
   * @apiPermission public
   * @apiName GetMuteState
   * @apiGroup REST Mute
   *
   * @apiDescription Returns whether a muter address mutes a mutee address.
   *
   * @apiQuery {String} muter Cash address of the muter
   * @apiQuery {String} mutee Cash address of the mutee
   *
   * @apiSuccess {String} muterAddr Muter cash address
   * @apiSuccess {String} muteeAddr Mutee cash address
   * @apiSuccess {Boolean} muted True when an active mute record exists
   */
  async getMuteState (ctx) {
    try {
      const { muter, mutee } = ctx.query
      ctx.body = await this.useCases.muteState.execute({ muterAddr: muter, muteeAddr: mutee })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /mute/muted/:muter List muted addresses
   * @apiPermission public
   * @apiName GetMuted
   * @apiGroup REST Mute
   *
   * @apiDescription Returns the addresses a muter currently mutes.
   *
   * @apiParam {String} muter Cash address of the muter
   *
   * @apiSuccess {String} muterAddr Muter cash address
   * @apiSuccess {String[]} muted Array of mutee cash addresses
   */
  async getMuted (ctx) {
    try {
      const { muter } = ctx.params
      ctx.body = await this.useCases.listMuted.execute({ muterAddr: muter })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default MuteRESTControllerLib

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-29T03:32:28.766Z","module_hash":"d64a285141e5c61b633b087777d2649ee4d7597206e59bedc6dbdb797cefddae","functions":[{"id":"func/MuteRESTControllerLib.constructor","name":"MuteRESTControllerLib.constructor","line":8,"end_line":21,"hash":"05eda89865cbf8f59f0d9cafe012c2185eeff9082d90636e6f8675f9b2df8453"},{"id":"func/MuteRESTControllerLib.handleError","name":"MuteRESTControllerLib.handleError","line":23,"end_line":30,"hash":"a2129f52ffeeae961205b6fca5bf2f01e35494e724c5b72ee314013b343112c9"},{"id":"func/MuteRESTControllerLib.getMuteState","name":"MuteRESTControllerLib.getMuteState","line":47,"end_line":54,"hash":"3c140541ac30e5c8f029fc9b6b9c17ec09b096589e78f28b7565079fc50c639d"},{"id":"func/MuteRESTControllerLib.getMuted","name":"MuteRESTControllerLib.getMuted","line":69,"end_line":76,"hash":"aa4555e7b3ea3ec283273dd1ee53f8bf577fc591317cd211609c73f1863c4140"}]}
// mutate4javascript-manifest-end
