/*
  Topic Discovery Page behavior: load and display a page of Memo topics.

  This is the testable controller behind the React "Topics" page. It wraps
  the MemoDb client and exposes the loaded topics and pagination so the view
  can render each topic name and post count and move between pages.
*/

const PaginatedPage = require('./paginated-page')
const { relativeTime } = require('./relative-time')

const TOPICS_PATH = '/topics'

class TopicDiscoveryPage extends PaginatedPage {
  constructor (deps = {}) {
    super(deps, {
      listField: 'topics',
      loadMethod: 'getTopics',
      errorMessage: 'Topic discovery page requires a memo db client.'
    })
    this.navigate = deps.navigate || (() => {})
  }

  getTopic (room) {
    return this.topics.find((topic) => topic.room === room) || null
  }

  // Label describing how long ago the room's most recent post was, computed
  // from the API's lastSeen timestamp. Returns null when the topic is not
  // loaded. `now` is injectable so the label is deterministic in tests.
  getLastSeenLabel (room, now = Date.now()) {
    const topic = this.getTopic(room)
    if (!topic) return null
    return relativeTime(topic.lastSeen, now)
  }

  openTopic (room) {
    const path = TopicDiscoveryPage.topicFeedPath(room)
    this.navigate(path)
    return { path }
  }
}

TopicDiscoveryPage.TOPICS_PATH = TOPICS_PATH
TopicDiscoveryPage.topicFeedPath = function (room) {
  return `${TOPICS_PATH}/${encodeURIComponent(room)}`
}

module.exports = TopicDiscoveryPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-17T16:44:01.309Z","module_hash":"5d9d81d1a2fa72e4365f6db50999dc28988b51dfe9c90662187ebc8dc634bba9","functions":[{"id":"func/TopicDiscoveryPage.constructor","name":"TopicDiscoveryPage.constructor","line":14,"end_line":21,"hash":"78cbee16b0d08e3f695dc65865466d12424e67d40f16683603585a48adfc2510"},{"id":"func/TopicDiscoveryPage.getTopic","name":"TopicDiscoveryPage.getTopic","line":23,"end_line":25,"hash":"7faf4b56db0bc89d32176a1741546958495ba10b5f313581f321de47e58ecb95"},{"id":"func/TopicDiscoveryPage.openTopic","name":"TopicDiscoveryPage.openTopic","line":27,"end_line":31,"hash":"ebd17b5f176c964308b69705b7a53af4c9c392e9856308b3095d69151ebde9aa"}]}
// mutate4javascript-manifest-end
