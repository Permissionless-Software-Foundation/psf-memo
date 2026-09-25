/*
  Read client for psf-memo-db's newest-qualifying-post read API.

  The indexer establishes a profile's recency when a set-profile transaction
  arrives after the address has already posted. Rather than scanning
  addrPostHeights across the REST boundary, it asks psf-memo-db for the newest
  confirmed qualifying post for that one address.

  GET /profile/newest-post/:addr returns `{ addr, blockHeight, seen }`, or an
  empty object when the address has no qualifying post. The address is
  URL-encoded because cash addresses contain colons.
*/

import axios from 'axios'
import config from '../../config/index.js'

export function createNewestQualifyingPost (localConfig = {}) {
  const baseUrl = localConfig.psfMemoDbUrl || config.psfMemoDbUrl

  return {
    async get (addr) {
      const response = await axios.get(
        `${baseUrl}/profile/newest-post/${encodeURIComponent(addr)}`
      )
      const data = response.data
      return data && data.addr ? data : null
    }
  }
}
