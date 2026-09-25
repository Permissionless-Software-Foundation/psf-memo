/*
  Entry point for the Memo block indexer.
*/

import RetryQueue from '@chris.troutner/retry-queue'
import 'dotenv/config'

import config from './config/index.js'
import Adapters from './src/adapters/adapters-index.js'
import UseCases from './src/use-cases/use-cases-index.js'
import Controllers from './src/controllers/controllers-index.js'

async function start () {
  try {
    const adapters = new Adapters()
    await adapters.initAdapters()

    const useCases = new UseCases({ adapters })
    await useCases.initUseCases()

    const controllers = new Controllers({ useCases, adapters })
    await controllers.initControllers()

    const queue = new RetryQueue()

    console.log('Starting Memo block indexer...')

    const status = await useCases.state.getStatus()
    console.log('Indexer State:', status)

    let nextBlockHeight = status.syncedBlockHeight + 1
    let biggestBlockHeight = await queue.addToQueue(adapters.rpc.getBlockCount, {})

    if (nextBlockHeight <= biggestBlockHeight) {
      do {
        const blockStart = new Date()
        await useCases.indexBlocks.processBlock(nextBlockHeight)

        const blockProcessTime = new Date().getTime() - blockStart.getTime()
        console.log(`Block ${nextBlockHeight} processed in ${blockProcessTime / 1000}s`)

        nextBlockHeight = await useCases.state.updateIndexedBlockHeight({
          lastIndexedBlockHeight: nextBlockHeight
        })

        if (controllers.keyboard.stopStatus()) {
          console.log(`Stopped at block ${nextBlockHeight - 1}`)
          process.exit(1)
        }

        const backedUp = await useCases.backupDb.maybeBackupDb(
          nextBlockHeight,
          config.dbBackupEpoch
        )
        if (backedUp) {
          console.log(`Creating DB backup at block ${nextBlockHeight}`)
        }

        biggestBlockHeight = await queue.addToQueue(adapters.rpc.getBlockCount, {})
      } while (nextBlockHeight <= biggestBlockHeight)
    } else {
      console.log(`Already at tip (block ${status.syncedBlockHeight}).`)
    }

    console.log(`\nIBD complete. Last block: ${nextBlockHeight - 1}`)

    await adapters.zmq.connect()
    console.log('Connected to ZMQ.')

    // Hand off to the TX indexer in the background. A failed or unanswered
    // handoff is retried by the use case and must never stop block indexing.
    useCases.txIndexerHandoff.startInBackground()
    console.log('TX indexer handoff started in the background.')

    let loopCnt = 0
    const liveStatus = status
    do {
      let blockHeight = await queue.addToQueue(adapters.rpc.getBlockCount, {})
      const block = adapters.zmq.getBlock()

      if (block) {
        const blockHeader = await queue.addToQueue(
          adapters.rpc.getBlockHeader,
          block.hash
        )
        blockHeight = blockHeader.height

        liveStatus.syncedBlockHeight = blockHeight
        liveStatus.chainBlockHeight = blockHeight
        await adapters.statusDb.updateStatus(liveStatus)

        await useCases.indexBlocks.processBlock(blockHeight)
        await useCases.backupDb.maybeBackupDb(blockHeight, config.dbBackupEpoch)
      }

      loopCnt++
      if (loopCnt > 100) {
        loopCnt = 0
        console.log(`ZMQ alive. Block height: ${blockHeight}`)
      }

      await useCases.utils.sleep(500)
    } while (1)
  } catch (err) {
    console.error('Error in psf-memo-block-indexer:', err)
    process.exit(1)
  }
}

start()

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T18:28:22.209Z","module_hash":"705fd886c6b1bd74022bb3770c554ffb6f606d90248ce42a361ba61a6002747b","functions":[{"id":"func/start","name":"start","line":13,"end_line":108,"hash":"c219519b21b14588b6c5fa7d34010bec5f1cfbdc4bb5ec0a45a416f0b8d85935"}]}
// mutate4javascript-manifest-end
