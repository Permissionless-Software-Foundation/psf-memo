/*
  Topic Discovery Page behavior: load and display a page of Memo topics.

  This is the testable controller behind the React "Topics" page. It wraps
  the MemoDb client and exposes the loaded topics and pagination so the view
  can render each topic name and post count and move between pages.
*/

const PaginatedPage = require('./paginated-page')
const { relativeTime } = require('./relative-time')

const TOPICS_PATH = '/topics'
const NEW_TOPIC_PATH = '/topics/new'

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

  // The page always offers a New Topic entry point.
  hasNewTopicButton () {
    return true
  }

  openNewTopic () {
    this.navigate(NEW_TOPIC_PATH)
    return { path: NEW_TOPIC_PATH }
  }
}

TopicDiscoveryPage.TOPICS_PATH = TOPICS_PATH
TopicDiscoveryPage.NEW_TOPIC_PATH = NEW_TOPIC_PATH
TopicDiscoveryPage.topicFeedPath = function (room) {
  return `${TOPICS_PATH}/${encodeURIComponent(room)}`
}

module.exports = TopicDiscoveryPage

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T17:33:13.115Z","module_hash":"079febdc0ae115235882999f2ecddab5f6a5c48a6c71cd3578f369f2cfbba8ab","functions":[{"id":"func/TopicDiscoveryPage.constructor","name":"TopicDiscoveryPage.constructor","line":16,"end_line":23,"hash":"78cbee16b0d08e3f695dc65865466d12424e67d40f16683603585a48adfc2510"},{"id":"func/TopicDiscoveryPage.getTopic","name":"TopicDiscoveryPage.getTopic","line":25,"end_line":27,"hash":"7faf4b56db0bc89d32176a1741546958495ba10b5f313581f321de47e58ecb95"},{"id":"func/TopicDiscoveryPage.getLastSeenLabel","name":"TopicDiscoveryPage.getLastSeenLabel","line":32,"end_line":36,"hash":"3f180b8beaf2126a36cdd9d597945e61274dc312cb0f080e208a995e107ab920"},{"id":"func/TopicDiscoveryPage.openTopic","name":"TopicDiscoveryPage.openTopic","line":38,"end_line":42,"hash":"ebd17b5f176c964308b69705b7a53af4c9c392e9856308b3095d69151ebde9aa"},{"id":"func/TopicDiscoveryPage.hasNewTopicButton","name":"TopicDiscoveryPage.hasNewTopicButton","line":45,"end_line":47,"hash":"0915d0c3e407a5e11ec6daaecbc72e578631097b54e912a7d1a159dae9f9a04c"},{"id":"func/TopicDiscoveryPage.openNewTopic","name":"TopicDiscoveryPage.openNewTopic","line":49,"end_line":52,"hash":"475e4ee33b5002033db8c1cc9c4cf62a937a765556cd36899d4334a3f3754625"}]}
// mutate4javascript-manifest-end
