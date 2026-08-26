import Server from './bin/server.js'

const server = new Server()

process.on('unhandledRejection', (reason) => {
  console.log('Unhandled rejection:', reason)
})

server.startServer()
