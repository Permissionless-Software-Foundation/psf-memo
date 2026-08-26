/*
  REST API controller for /health routes.
*/

class HealthRESTControllerLib {
  constructor () {
    this.getHealth = this.getHealth.bind(this)
  }

  /**
   * @api {get} /health Health check
   * @apiPermission public
   * @apiName GetHealth
   * @apiGroup REST Health
   *
   * @apiDescription Returns a simple status payload for load balancers and compose health checks.
   *
   * @apiExample Example usage:
   * curl -X GET localhost:5021/health
   *
   * @apiSuccess {String} status Always "ok" when the service is running
   */
  async getHealth (ctx) {
    ctx.body = { status: 'ok' }
  }
}

export default HealthRESTControllerLib
