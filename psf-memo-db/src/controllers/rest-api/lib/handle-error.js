/*
  Shared REST controller error handling.

  The per-controller handleError methods were identical except for the
  controller name in the log message, so the common logic lives here.
*/

import wlogger from '../../../adapters/wlogger.js'

export function handleControllerError (ctx, err, controllerName) {
  if (err.status) {
    ctx.throw(err.status, err.message || err)
  } else {
    wlogger.error(`Error in ${controllerName} controller: `, err)
    ctx.throw(500, err.message || 'Internal server error')
  }
}
