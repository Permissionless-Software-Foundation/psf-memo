/*
  List available wallets.
*/

// Global npm libraries
import shelljs from 'shelljs'
import Table from 'cli-table'
import { readFile as readFileImpl } from 'fs/promises'

// Local libraries
import { bindMethods } from '../lib/bind-methods.js'
import { runCommand } from '../lib/reporter.js'

// Global variables
const __dirname = import.meta.dirname

class WalletList {
  constructor ({ shelljs: shell = shelljs, Table: TableClass = Table, readFile = readFileImpl, stdout, stderr } = {}) {
    // Encapsulate dependencies
    this.shelljs = shell
    this.Table = TableClass
    this.readFile = readFile
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

  // Parse data from the wallets directory into a formatted array.
  async parseWallets () {
    const fileList = this.shelljs.ls(
      `${__dirname.toString()}/../../.wallets/*.json`
    )

    if (fileList.length === 0) {
      return []
    }

    const retData = []

    // Loop through each wallet returned.
    for (let i = 0; i < fileList.length; i++) {
      const thisFile = fileList[i]

      const lastPart = thisFile.indexOf('.json')

      const lastSlash = thisFile.indexOf('.wallets/') + 1

      let name = thisFile.slice(8, lastPart)

      name = name.slice(lastSlash)

      // Read the contents of the wallet file.
      const walletStr = await this.readFile(thisFile)
      const walletInfo = JSON.parse(walletStr)

      retData.push([name, walletInfo.wallet.description])
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
