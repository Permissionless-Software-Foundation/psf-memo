/*
  HTTP client for the psf-memo-db REST API.
*/

import axios from 'axios'
import config from '../config'

class MemoDb {
  constructor () {
    this.axios = axios
  }

  async getRecentProfiles ({ limit = 100, offset = 0 } = {}) {
    return this.getRecent('/profile/recent', 'getRecentProfiles', { limit, offset })
  }

  async getRecentPosts ({ limit = 100, offset = 0 } = {}) {
    return this.getRecent('/posts/recent', 'getRecentPosts', { limit, offset })
  }

  async getProfile (addr) {
    return this.getLevelResource('profile', addr, 'getProfile')
  }

  async getProfilePic (addr) {
    return this.getLevelResource('profilepic', addr, 'getProfilePic')
  }

  async getName (addr) {
    return this.getLevelResource('name', addr, 'getName')
  }

  // GET a paginated 'recent' listing endpoint.
  async getRecent (path, name, params) {
    try {
      const result = await this.axios.get(`${config.backend}${path}`, {
        params
      })

      return result.data
    } catch (err) {
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  // GET a level endpoint that resolves an address. Returns null on 404.
  async getLevelResource (endpoint, addr, name) {
    try {
      const result = await this.axios.get(
        `${config.backend}/level/${endpoint}/${encodeURIComponent(addr)}`
      )
      return result.data
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null
      }
      console.error(`Error in ${name}()`)
      throw err
    }
  }

  async getPostsByAddr (addr, { limit = 100, offset = 0 } = {}) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/by/${encodeURIComponent(addr)}`,
        { params: { limit, offset } }
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostsByAddr()')
      throw err
    }
  }

  async getPostThread (txid) {
    try {
      const result = await this.axios.get(
        `${config.backend}/posts/${encodeURIComponent(txid)}/thread`
      )

      return result.data
    } catch (err) {
      console.error('Error in getPostThread()')
      throw err
    }
  }
}

export default MemoDb
