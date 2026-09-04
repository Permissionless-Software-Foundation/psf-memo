/*
  Recent Profiles Page behavior: load and display the most recent Memo profiles.

  This is the testable controller behind the React "Recent Profiles" page. It
  wraps the MemoDb client and exposes the loaded profiles and pagination so the
  view can render them.
*/

const PaginatedPage = require('./paginated-page')

const RECENT_PROFILES_PATH = '/profile/recent'

class RecentProfilesPage extends PaginatedPage {
  constructor (deps = {}) {
    super(deps, {
      listField: 'profiles',
      loadMethod: 'getRecentProfiles',
      errorMessage: 'Recent profiles page requires a memo db client.'
    })
  }

  getProfile (addr) {
    return this.profiles.find((profile) => profile.addr === addr) || null
  }
}

RecentProfilesPage.RECENT_PROFILES_PATH = RECENT_PROFILES_PATH

module.exports = RecentProfilesPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-04T17:03:40.330Z","module_hash":"8a305e7c3c74e6ef33e57da9a0c1f3d3e0eff6ff2d6da99d1383d93874745b65","functions":[{"id":"func/RecentProfilesPage.constructor","name":"RecentProfilesPage.constructor","line":14,"end_line":20,"hash":"01a7876c30597e8eb8e37003290b8a9c9db2d3f2bc7305104e1b02659cc413c5"},{"id":"func/RecentProfilesPage.getProfile","name":"RecentProfilesPage.getProfile","line":22,"end_line":24,"hash":"c93f06a279f8976938fc8b91ce24e9e742c700ac6ff271328192dba9140ae195"}]}
// mutate4javascript-manifest-end
