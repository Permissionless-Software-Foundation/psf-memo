/*
  List available wallets.
*/

// Global npm libraries
import shelljs from 'shelljs'
import Table from 'cli-table'
import { readFile } from 'fs/promises'
import { bindMethods } from '../lib/bind-methods.js'

// Global variables
const __dirname = import.meta.dirname

class WalletList {
  constructor () {
    // Encapsulate dependencies
    this.shelljs = shelljs
    this.Table = Table

    // Bind 'this' object to all subfunctions.
    bindMethods(this, ['run', 'parseWallets', 'displayTable'])
  }

  async run (flags) {
    try {
      const walletData = await this.parseWallets()
      // console.log(`walletData: ${JSON.stringify(walletData, null, 2)}`)

      this.displayTable(walletData)

      return true
    } catch (err) {
      console.error('Error in wallet-list: ', err)
      return 0
    }
  }

  // Parse data from the wallets directory into a formatted array.
  async parseWallets () {
    const fileList = this.shelljs.ls(
      `${__dirname.toString()}/../../.wallets/*.json`
    )
    // console.log('fileList: ', fileList)

    if (fileList.length === 0) {
      console.log('No wallets found.')
      return []
    }

    const retData = []

    // Loop through each wallet returned.
    for (let i = 0; i < fileList.length; i++) {
      const thisFile = fileList[i]
      // console.log(`thisFile: ${thisFile}`)

      const lastPart = thisFile.indexOf('.json')

      const lastSlash = thisFile.indexOf('.wallets/') + 1
      // console.log(`lastSlash: ${lastSlash}`)

      let name = thisFile.slice(8, lastPart)
      // console.log(`name: ${name}`)

      name = name.slice(lastSlash)

      // Read the contents of the wallet file.
      const walletStr = await readFile(thisFile)
      const walletInfo = JSON.parse(walletStr)

      retData.push([name, walletInfo.wallet.description])
    }

    return retData
  }

  // Display table in a table on the command line using cli-table.
  displayTable (data) {
    const table = new Table({
      head: ['Name', 'Description'],
      colWidths: [25, 55]
    })

    for (let i = 0; i < data.length; i++) table.push(data[i])

    const tableStr = table.toString()

    // Cut down on screen spam when running unit tests.
    console.log(tableStr)

    return tableStr
  }
}

export default WalletList

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:49:49.056Z","module_hash":"39a149891203722111cf8c086285fe5cceefcdc727a853fba475a7ace1efc338","functions":[{"id":"func/WalletList.constructor","name":"WalletList.constructor","line":15,"end_line":22,"hash":"feadcccbde21d66aecff10bc0cce63d89cd46536b754dcd2e0208edb107d8aa8"},{"id":"func/WalletList.run","name":"WalletList.run","line":24,"end_line":36,"hash":"52102bb9270cd46f9139885c9e39d30fbb989f3e7a7e6f1177abb0ca67c6db28"},{"id":"func/WalletList.parseWallets","name":"WalletList.parseWallets","line":39,"end_line":75,"hash":"888945d787ddd42b6d1bd0ec960d8e7a02332371c9424a211b1b411a08b0c02c"},{"id":"func/WalletList.displayTable","name":"WalletList.displayTable","line":78,"end_line":92,"hash":"d3e432f85f944e49161a2e102d0b63da7d0c78351a4b8f1f051b15533eec642c"}]}
// mutate4javascript-manifest-end
