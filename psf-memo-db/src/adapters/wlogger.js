'use strict'

import winston from 'winston'
import config from '../../config/index.js'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})

logger.info(`Wlogger initialized for env: ${config.env}`)

export default logger
