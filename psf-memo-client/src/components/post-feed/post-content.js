/*
  Render Memo post text, embedding YouTube videos inline when present.

  Written in plain React.createElement style so the same module can be used
  both by the JSX components in the browser build and by the acceptance
  adapter that renders HTML under Node.
*/

const React = require('react')
const {
  parsePostText,
  YOUTUBE_EMBED_BASE_URL
} = require('../../services/youtube-embed')

function PostContent ({ text = '' }) {
  const segments = parsePostText(text)
  const children = segments.map((segment, index) => {
    if (segment.type === 'youtube') {
      return React.createElement(
        'div',
        {
          key: index,
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
    }
    return React.createElement('span', { key: index }, segment.text)
  })

  return React.createElement(React.Fragment, null, ...children)
}

module.exports = PostContent
