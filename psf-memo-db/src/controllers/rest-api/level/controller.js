/*
  REST API Controller for /level routes.
*/

import wlogger from '../../../adapters/wlogger.js'
import { makeCrudHandlers, ENTITY_CONFIG } from './crud-handlers.js'

class LevelRESTControllerLib {
  constructor (localConfig = {}) {
    this.adapters = localConfig.adapters
    this.useCases = localConfig.useCases
    if (!this.adapters) {
      throw new Error('Adapters required for Level REST Controller.')
    }

    this.handleError = this.handleError.bind(this)
    this.getStatus = this.getStatus.bind(this)
    this.createStatus = this.createStatus.bind(this)
    this.updateStatus = this.updateStatus.bind(this)
    this.deleteStatus = this.deleteStatus.bind(this)
    this.backup = this.backup.bind(this)
    this.restore = this.restore.bind(this)

    this.entityHandlers = {}
    for (const cfg of ENTITY_CONFIG) {
      const handlers = makeCrudHandlers(cfg)
      this.entityHandlers[cfg.route] = {
        get: async (ctx) => this._wrap(handlers.get, ctx),
        create: async (ctx) => this._wrap(handlers.create, ctx),
        update: async (ctx) => this._wrap(handlers.update, ctx),
        delete: async (ctx) => this._wrap(handlers.delete, ctx),
        keyParam: cfg.keyParam
      }
    }
  }

  handleError (ctx, err) {
    if (err.status) {
      ctx.throw(err.status, err.message || err)
    } else {
      ctx.throw(422, err.message)
    }
  }

  async _wrap (fn, ctx) {
    try {
      await fn(ctx, this.adapters)
    } catch (err) {
      wlogger.error('Error in level controller: ', err)
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {get} /level/status/:statusKey Get indexer status
   * @apiPermission public
   * @apiName GetLevelStatus
   * @apiGroup Level Status
   *
   * @apiDescription Read a status document from the status LevelDB store.
   *
   * @apiParam {String} statusKey Status key (typically "status")
   *
   * @apiExample Example usage:
   * curl -X GET localhost:5021/level/status/status
   *
   * @apiSuccess {Number} startBlockHeight First block indexed
   * @apiSuccess {Number} syncedBlockHeight Last fully indexed block
   * @apiSuccess {Number} chainBlockHeight Current chain tip at last sync
   */
  async getStatus (ctx) {
    try {
      const { statusKey } = ctx.params
      ctx.body = await this.adapters.level.statusDb.get(statusKey)
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {post} /level/status Create indexer status record
   * @apiPermission public
   * @apiName CreateLevelStatus
   * @apiGroup Level Status
   *
   * @apiDescription Create or overwrite a status document in the status LevelDB store.
   *
   * @apiBody {String} statusKey Status key (typically "status")
   * @apiBody {Object} statusData Sync state document
   * @apiBody {Number} statusData.startBlockHeight First block indexed
   * @apiBody {Number} statusData.syncedBlockHeight Last fully indexed block
   * @apiBody {Number} statusData.chainBlockHeight Current chain tip at last sync
   *
   * @apiExample Example usage:
   * curl -H "Content-Type: application/json" -X POST localhost:5021/level/status \
   *   -d '{"statusKey":"status","statusData":{"startBlockHeight":524999,"syncedBlockHeight":800000,"chainBlockHeight":800001}}'
   *
   * @apiSuccess {String} statusKey Status key written
   * @apiSuccess {Boolean} success true
   */
  async createStatus (ctx) {
    try {
      const { statusKey, statusData } = ctx.request.body
      await this.adapters.level.statusDb.put(statusKey, statusData)
      ctx.body = { statusKey, success: true }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {put} /level/status Update indexer status
   * @apiPermission public
   * @apiName UpdateLevelStatus
   * @apiGroup Level Status
   *
   * @apiDescription Update the status document keyed as "status".
   *
   * @apiBody {Object} statusData Sync state document
   * @apiBody {Number} statusData.startBlockHeight First block indexed
   * @apiBody {Number} statusData.syncedBlockHeight Last fully indexed block
   * @apiBody {Number} statusData.chainBlockHeight Current chain tip at last sync
   *
   * @apiExample Example usage:
   * curl -H "Content-Type: application/json" -X PUT localhost:5021/level/status \
   *   -d '{"statusData":{"startBlockHeight":524999,"syncedBlockHeight":800001,"chainBlockHeight":800002}}'
   *
   * @apiSuccess {String} statusKey Always "status"
   * @apiSuccess {Boolean} success true
   */
  async updateStatus (ctx) {
    try {
      const statusKey = 'status'
      const { statusData } = ctx.request.body
      await this.adapters.level.statusDb.put(statusKey, statusData)
      ctx.body = { statusKey, success: true }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {delete} /level/status/:statusKey Delete indexer status
   * @apiPermission public
   * @apiName DeleteLevelStatus
   * @apiGroup Level Status
   *
   * @apiDescription Delete a status document from the status LevelDB store.
   *
   * @apiParam {String} statusKey Status key to delete
   *
   * @apiExample Example usage:
   * curl -X DELETE localhost:5021/level/status/status
   *
   * @apiSuccess {String} statusKey Deleted status key
   * @apiSuccess {Boolean} success true
   */
  async deleteStatus (ctx) {
    try {
      const { statusKey } = ctx.params
      await this.adapters.level.statusDb.del(statusKey)
      ctx.body = { statusKey, success: true }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {post} /level/backup Backup LevelDB to zip archive
   * @apiPermission public
   * @apiName BackupLevelDb
   * @apiGroup Level Admin
   *
   * @apiDescription Zip the current LevelDB directory to leveldb/zips/memo-indexer-{height}.zip.
   *
   * @apiBody {Number} height Block height label for the backup filename
   * @apiBody {Number} epoch Epoch identifier included in backup metadata
   *
   * @apiExample Example usage:
   * curl -H "Content-Type: application/json" -X POST localhost:5021/level/backup \
   *   -d '{"height":800000,"epoch":1}'
   *
   * @apiSuccess {Boolean} success true
   */
  async backup (ctx) {
    try {
      const { height, epoch } = ctx.request.body
      await this.adapters.dbBackup.zipDb(height, epoch)
      ctx.body = { success: true }
    } catch (err) {
      this.handleError(ctx, err)
    }
  }

  /**
   * @api {post} /level/restore Restore LevelDB from zip archive
   * @apiPermission public
   * @apiName RestoreLevelDb
   * @apiGroup Level Admin
   *
   * @apiDescription Unzip a backup archive matching the given height and exit the process for restart by a process manager.
   *
   * @apiBody {Number} height Block height label of the backup to restore
   *
   * @apiExample Example usage:
   * curl -H "Content-Type: application/json" -X POST localhost:5021/level/restore \
   *   -d '{"height":800000}'
   *
   * @apiSuccess {Boolean} success true
   */
  async restore (ctx) {
    try {
      const { height } = ctx.request.body
      await this.adapters.dbBackup.unzipDb(height)
      console.log('Restore complete. Exiting for process manager restart.')
      process.exit(0)
    } catch (err) {
      this.handleError(ctx, err)
    }
  }
}

export default LevelRESTControllerLib
