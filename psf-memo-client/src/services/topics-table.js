/*
  Build the topics page table view model.

  The React Topics page renders a react-bootstrap Table from this model so the
  column layout stays testable without a DOM. The header row labels the four
  columns in order, and every body row carries the topic name, relative-time
  label, post count, and follower count in the same order so a value never
  drifts into another column. Each row also carries the link to its topic feed.
*/

const { relativeTime } = require('./relative-time')
const TopicDiscoveryPage = require('./topic-discovery-page')

const TOPICS_TABLE_HEADERS = ['Topic', 'Most recent post', 'Posts', 'Followers']
const TOPICS_TABLE_WRAPPER_CLASS = 'table-responsive'

function buildTopicsTable (topics = [], { now = Date.now() } = {}) {
  const rows = topics.map((topic) => ({
    room: topic.room,
    href: TopicDiscoveryPage.topicFeedPath(topic.room),
    cells: [
      `#${topic.room}`,
      relativeTime(topic.lastSeen, now),
      `${topic.postCount ?? 0} posts`,
      `${topic.followerCount ?? 0} followers`
    ]
  }))

  return {
    headers: [...TOPICS_TABLE_HEADERS],
    rows,
    wrapperClass: TOPICS_TABLE_WRAPPER_CLASS
  }
}

module.exports = {
  TOPICS_TABLE_HEADERS,
  TOPICS_TABLE_WRAPPER_CLASS,
  buildTopicsTable
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-18T14:43:18.415Z","module_hash":"34ffd8c2e8cbc5936e9947eb0cb0a50694a0be73e069f57f781aa5a817d703e2","functions":[{"id":"func/buildTopicsTable","name":"buildTopicsTable","line":17,"end_line":34,"hash":"a27426625952c739f34c39d165589f67fcdf71ebd8a1a6bb84e2f0f33668f870"}]}
// mutate4javascript-manifest-end
