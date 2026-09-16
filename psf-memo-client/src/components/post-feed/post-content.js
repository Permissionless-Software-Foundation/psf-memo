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
// {"version":1,"tested_at":"2026-09-16T14:26:42.561Z","module_hash":"1d42bd3e5405ed39e16d308688f75b48430484dcd5096bae9de0e702fd058568","functions":[{"id":"func/PostImage","name":"PostImage","line":22,"end_line":51,"hash":"a7bd61e03c785b7ed6ae1ef0ea15e3d025448f5772b60234f08acd4fd4160a2d"},{"id":"func/PostContent","name":"PostContent","line":53,"end_line":120,"hash":"9af7f0009bd6d71655a47b09a3676f558acdf14a2ceb672765370a82aaf0a150"}]}
// mutate4javascript-manifest-end
