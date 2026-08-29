/*
  REST API controller for /mute routes.
*/

import wlogger from '../../../adapters/wlogger.js'

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
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      wlogger.error('Error in mute controller: ', err)
      ctx.throw(500, err.message || 'Internal server error')
    }
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
