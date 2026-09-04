/*
  REST API controller for /follow routes.
*/

import { handleControllerError } from '../lib/handle-error.js'

class FollowRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Follow REST Controller.')
    }
    if (!this.useCases) {
      throw new Error('Use Cases required for Follow REST Controller.')
    }

    this.getFollowState = this.getFollowState.bind(this)
    this.getFollowing = this.getFollowing.bind(this)
    this.getFollowers = this.getFollowers.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  handleError (ctx, err) {
    handleControllerError(ctx, err, 'follow')
  }

  /**
   * @api {get} /follow/state Check follow state
   * @apiPermission public
   * @apiName GetFollowState
   * @apiGroup REST Follow
   *
   * @apiDescription Returns whether a follower address follows a followee address.
   *
   * @apiQuery {String} follower Cash address of the follower
   * @apiQuery {String} followee Cash address of the followee
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/follow/state?follower=bitcoincash:q...&followee=bitcoincash:q..."
   *
   * @apiSuccess {String} followerAddr Follower cash address
   * @apiSuccess {String} followeeAddr Followee cash address
   * @apiSuccess {Boolean} following True when an active follow record exists
   */
  async getFollowState (ctx) {
    try {
      const { follower, followee } = ctx.query
      ctx.body = await this.useCases.followState.execute({ followerAddr: follower, followeeAddr: followee })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /follow/following List following
   * @apiPermission public
   * @apiName GetFollowing
   * @apiGroup REST Follow
   *
   * @apiDescription Returns the addresses a follower currently follows.
   *
   * @apiParam {String} follower Cash address of the follower
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/follow/following/bitcoincash:q..."
   *
   * @apiSuccess {String} followerAddr Follower cash address
   * @apiSuccess {String[]} following Array of followee cash addresses
   */
  async getFollowing (ctx) {
    try {
      const { follower } = ctx.params
      ctx.body = await this.useCases.listFollowing.execute({ followerAddr: follower })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /follow/followers List followers
   * @apiPermission public
   * @apiName GetFollowers
   * @apiGroup REST Follow
   *
   * @apiDescription Returns the addresses that currently follow a followee.
   *
   * @apiParam {String} followee Cash address of the followee
   *
   * @apiExample Example usage:
   * curl -X GET "localhost:5021/follow/followers/bitcoincash:q..."
   *
   * @apiSuccess {String} followeeAddr Followee cash address
   * @apiSuccess {String[]} followers Array of follower cash addresses
   */
  async getFollowers (ctx) {
    try {
      const { followee } = ctx.params
      ctx.body = await this.useCases.listFollowers.execute({ followeeAddr: followee })
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default FollowRESTControllerLib
