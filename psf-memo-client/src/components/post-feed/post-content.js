/*
  Render Memo post text, embedding YouTube videos inline and linking URLs.

  Written in plain React.createElement style so the same module can be used
  both by the JSX components in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')
const {
  parsePostText,
  YOUTUBE_EMBED_BASE_URL
} = require('../../services/youtube-embed')
const { parsePostLinks } = require('../../services/post-links')

function PostContent ({ text = '' }) {
  const children = []

  for (const segment of parsePostText(text)) {
    if (segment.type === 'youtube') {
      children.push(
        React.createElement(
          'div',
          {
            className: 'posts-feed-item-youtube'
          },
          React.createElement('iframe', {
            src: `${YOUTUBE_EMBED_BASE_URL}/${segment.videoId}`,
            title: `YouTube video ${segment.videoId}`,
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            referrerPolicy: 'strict-origin-when-cross-origin',
            allowFullScreen: true,
            frameBorder: '0'
          })
        )
      )
      continue
    }

    for (const link of parsePostLinks(segment.text)) {
      if (link.type === 'link') {
        children.push(
          React.createElement(
            'a',
            {
              href: link.href,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'posts-feed-item-link'
            },
            link.text
          )
        )
      } else {
        children.push(React.createElement('span', null, link.text))
      }
    }
  }

  // React.Children.toArray assigns stable positional keys without a mutable
  // counter, so the rendered output does not depend on key values.
  return React.createElement(React.Fragment, null, ...React.Children.toArray(children))
}

module.exports = PostContent

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-16T02:29:59.905Z","module_hash":"bbc07a4d5e0d9bdf95e1d9014603fbe4ad38611469d51e006b082d32b5bd03c6","functions":[{"id":"func/PostContent","name":"PostContent","line":16,"end_line":63,"hash":"d2202910528f0974b6eaa1892d770e1a46a11e02b5b953c1a8490be59f349895"}]}
// mutate4javascript-manifest-end
