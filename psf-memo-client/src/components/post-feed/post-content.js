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
  let key = 0
  const children = []

  for (const segment of parsePostText(text)) {
    if (segment.type === 'youtube') {
      children.push(
        React.createElement(
          'div',
          {
            key: key++,
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
              key: key++,
              href: link.href,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'posts-feed-item-link'
            },
            link.text
          )
        )
      } else {
        children.push(React.createElement('span', { key: key++ }, link.text))
      }
    }
  }

  return React.createElement(React.Fragment, null, ...children)
}

module.exports = PostContent
