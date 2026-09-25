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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-25T17:21:21.003Z","module_hash":"a3fc7be86758be1460505cf9fcfa351a70981ed73dbd1528de143a6b193feb5f","functions":[{"id":"func/createNewestQualifyingPost","name":"createNewestQualifyingPost","line":17,"end_line":29,"hash":"cb81e3beb8844321bd1ff55911398e58a346b0802a93849a4c48cb2401fb1e55"}]}
// mutate4javascript-manifest-end
