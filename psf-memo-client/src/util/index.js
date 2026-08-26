/*
  A utility library for holding functions that are commonly used by many different
  areas of the app.
*/

class AppUtil {
  // Returns a promise that resolves 'ms' milliseconds.
  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Copy a text to clipboard
  async copyToClipboard (text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }

  // Read text from clipboard
  async readFromClipboard () {
    try {
      const text = await navigator.clipboard.readText()

      return text
    } catch (err) {
      console.error('Failed to copy text:', err)
      // document.body.removeChild(textarea)
      return false
    }
  }

  // Read text from clipboard and pass it to a state setter.
  async pasteFromClipboard (setValue) {
    try {
      const text = await this.readFromClipboard()
      setValue(text)
    } catch (err) {
      console.warn('Error pasting from clipboard: ', err)
    }
  }
}

// Truncate a long string (address, txid, etc.) for compact display.
export function truncateAddr (addr, maxLen = 20) {
  if (!addr || addr.length <= maxLen) return addr
  const half = Math.floor((maxLen - 3) / 2)
  return `${addr.slice(0, half)}...${addr.slice(-half)}`
}

export function truncateTxid (txid, maxLen = 20) {
  return truncateAddr(txid, maxLen)
}

export default AppUtil
