/*
  List available wallets.
*/

// Global npm libraries
import Table from 'cli-table'
import { readdir as readdirImpl, readFile as readFileImpl } from 'fs/promises'
import path from 'path'

// Local libraries
import { bindMethods } from '../lib/bind-methods.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

const WALLETS_DIR = `${__dirname.toString()}/../../.wallets`

class WalletList {
  constructor ({ readdir = readdirImpl, Table: TableClass = Table, readFile = readFileImpl, walletDir = WALLETS_DIR, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.readdir = readdir
    this.Table = TableClass
    this.readFile = readFile
    this.walletDir = walletDir
    this.stdout = stdout
    this.stderr = stderr

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'parseWallets', 'displayTable'])
  }

  async run (flags = {}) {
    const code = await runCommand(async () => {
      const wallets = await this.parseWallets()

      return {
        message: wallets.length === 0 ? 'No wallets found.' : this.displayTable(wallets),
        data: {
          wallets: wallets.map(([name, description]) => ({ name, description }))
        }
      }
    }, {
      json: flags.json,
      stdout: this.stdout,
      stderr: this.stderr
    })

    process.exitCode = code
    return code
  }

  // Parse data from the wallets directory into a formatted array. An absent or
  // empty directory is an empty list; no shell error reaches stderr.
  async parseWallets () {
    let fileList
    try {
      fileList = await this.readdir(this.walletDir)
    } catch (err) {
      if (err.code === 'ENOENT') return []
      throw err
    }

    const retData = []

    // Loop through each wallet file, in stable name order.
    for (const name of fileList.filter((file) => file.endsWith('.json')).sort()) {
      // Read the contents of the wallet file.
      const walletStr = await this.readFile(path.join(this.walletDir, name))
      const walletInfo = JSON.parse(walletStr)

      retData.push([name.slice(0, -'.json'.length), walletInfo.wallet.description])
    }

    return retData
  }

  // Render the wallets as a table. The table is returned rather than printed so
  // the reporter owns the output channel.
  displayTable (data) {
    const table = new this.Table({
      head: ['Name', 'Description'],
      colWidths: [25, 55]
    })

    for (let i = 0; i < data.length; i++) table.push(data[i])

    return table.toString()
  }
}

export default WalletList

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-12T23:53:01.465Z","module_hash":"2e45fa8003810c7c6ca17101d601f894538750b6b7c7cba6c9c1c456651d59ef","functions":[{"id":"func/WalletList.constructor","name":"WalletList.constructor","line":20,"end_line":31,"hash":"43c83c66327146bcaf9552111eb0519bc1218686f7dbcf19f7722c635f58be8e"},{"id":"func/WalletList.run","name":"WalletList.run","line":33,"end_line":51,"hash":"dd214c3f9cc422965ce56657eead88f49e008823a99a1130cab3932df047cdac"},{"id":"func/WalletList.parseWallets","name":"WalletList.parseWallets","line":55,"end_line":76,"hash":"d7ecea4cb25d1e3947d90ee700cca96781e1aff0ffec33f57fa4b23151131229"},{"id":"func/WalletList.displayTable","name":"WalletList.displayTable","line":80,"end_line":89,"hash":"5f6b01ddda20a710385315b5303236e184b7622050d98a1db0d423e73071af00"}]}
// mutate4javascript-manifest-end
