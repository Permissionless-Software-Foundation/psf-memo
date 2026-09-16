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
const {
  parsePostLinks,
  isImageUrl,
  imageAltText
} = require('../../services/post-links')
const { addFailedImage } = require('../../services/failed-images')

// A post image that falls back to a plain link if the image fails to load.
function PostImage ({ href, alt, failed, onError }) {
  if (failed) {
    return React.createElement(
      'a',
      {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'posts-feed-item-link'
      },
      href
    )
  }

  return React.createElement(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'posts-feed-item-image-link'
    },
    React.createElement('img', {
      src: href,
      alt,
      className: 'posts-feed-item-image',
      onError
    })
  )
}

function PostContent ({ text = '', initialFailedImages }) {
  const [failedImages, setFailedImages] = React.useState(
    () => new Set(initialFailedImages || [])
  )
  const children = []

  const failImage = (href) => {
    setFailedImages((previous) => addFailedImage(previous, href))
  }

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
      if (link.type !== 'link') {
        children.push(React.createElement('span', null, link.text))
        continue
      }

      if (isImageUrl(link.href)) {
        children.push(
          React.createElement(PostImage, {
            href: link.href,
            alt: imageAltText(link.href),
            failed: failedImages.has(link.href),
            onError: () => failImage(link.href)
          })
        )
        continue
      }

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
