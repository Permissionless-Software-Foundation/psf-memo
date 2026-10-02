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
const { X_EMBED_BASE_URL, extractXStatusId } = require('../../services/x-embed')
const {
  TIKTOK_EMBED_BASE_URL,
  extractTikTokVideoId,
  extractTikTokShortCode
} = require('../../services/tiktok-embed')
const { resolveTikTokVideoId } = require('../../services/tiktok-oembed')
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

// A self-contained embedded YouTube player.
function youtubeEmbedNode (videoId) {
  return React.createElement(
    'div',
    {
      className: 'posts-feed-item-youtube'
    },
    React.createElement('iframe', {
      src: `${YOUTUBE_EMBED_BASE_URL}/${videoId}`,
      title: `YouTube video ${videoId}`,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      referrerPolicy: 'strict-origin-when-cross-origin',
      allowFullScreen: true,
      frameBorder: '0'
    })
  )
}

// A self-contained embedded X (Twitter) post frame.
function xEmbedNode (statusId) {
  return React.createElement(
    'div',
    {
      className: 'posts-feed-item-x-embed'
    },
    React.createElement('iframe', {
      src: `${X_EMBED_BASE_URL}?id=${statusId}`,
      title: `X post ${statusId}`,
      allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
      referrerPolicy: 'strict-origin-when-cross-origin',
      allowFullScreen: true,
      frameBorder: '0'
    })
  )
}

// A self-contained embedded TikTok player.
function tiktokEmbedNode (videoId) {
  return React.createElement(
    'div',
    {
      className: 'posts-feed-item-tiktok'
    },
    React.createElement('iframe', {
      src: `${TIKTOK_EMBED_BASE_URL}/${videoId}`,
      title: `TikTok video ${videoId}`,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      referrerPolicy: 'strict-origin-when-cross-origin',
      allowFullScreen: true,
      frameBorder: '0'
    })
  )
}

// Every TikTok short-link URL in the post text, cleaned the same way the
// renderer cleans rendered hrefs so resolution keys match the anchors.
function collectTikTokShortLinks (text) {
  const shortLinks = []
  for (const segment of parsePostText(text)) {
    if (segment.type !== 'text') continue
    for (const link of parsePostLinks(segment.text)) {
      if (link.type === 'link' && extractTikTokShortCode(link.href)) {
        shortLinks.push(link.href)
      }
    }
  }
  return shortLinks
}

// Resolve the post's TikTok short links to video ids in the background.  The
// initial map (used by tests and acceptance) is seeded synchronously; each
// unresolved short link is fetched at most once per component instance.
function useResolvedTikTokIds (shortLinks, initialIds, resolveTikTok) {
  const [resolved, setResolved] = React.useState(() => ({ ...(initialIds || {}) }))
  const attempted = React.useRef(new Set(Object.keys(initialIds || {})))
  const shortLinksKey = shortLinks.join('\n')

  React.useEffect(() => {
    if (typeof resolveTikTok !== 'function') return undefined

    const request = { cancelled: false }
    for (const url of shortLinksKey ? shortLinksKey.split('\n') : []) {
      if (attempted.current.has(url)) continue
      attempted.current.add(url)
      Promise.resolve(resolveTikTok(url))
        .then((videoId) => {
          if (request.cancelled || !videoId) return
          setResolved((previous) => ({ ...previous, [url]: String(videoId) }))
        })
        .catch(() => {})
    }

    return () => { request.cancelled = true }
  }, [shortLinksKey, resolveTikTok])

  return resolved
}

// Render one parsed post link: an image, an embedded X post, an embedded
// TikTok player, or a plain new-tab anchor.
function linkNode (link, { failedImages, onImageError, tiktokVideoIds }) {
  if (isImageUrl(link.href)) {
    return React.createElement(PostImage, {
      href: link.href,
      alt: imageAltText(link.href),
      failed: failedImages.has(link.href),
      onError: () => onImageError(link.href)
    })
  }

  const xStatusId = extractXStatusId(link.href)
  if (xStatusId) return xEmbedNode(xStatusId)

  const tiktokVideoId = extractTikTokVideoId(link.href) ||
    (tiktokVideoIds ? tiktokVideoIds[link.href] : null)
  if (tiktokVideoId) return tiktokEmbedNode(tiktokVideoId)

  return React.createElement(
    'a',
    {
      href: link.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'posts-feed-item-link'
    },
    link.text
  )
}

function PostContent ({
  text = '',
  initialFailedImages,
  tiktokVideoIds,
  resolveTikTok = resolveTikTokVideoId
}) {
  const [failedImages, setFailedImages] = React.useState(
    () => new Set(initialFailedImages || [])
  )
  const shortLinks = collectTikTokShortLinks(text)
  const resolvedTikTokIds = useResolvedTikTokIds(shortLinks, tiktokVideoIds, resolveTikTok)
  const children = []

  const failImage = (href) => {
    setFailedImages((previous) => addFailedImage(previous, href))
  }

  for (const segment of parsePostText(text)) {
    if (segment.type === 'youtube') {
      children.push(youtubeEmbedNode(segment.videoId))
      continue
    }

    for (const link of parsePostLinks(segment.text)) {
      if (link.type !== 'link') {
        children.push(React.createElement('span', null, link.text))
        continue
      }

      children.push(linkNode(link, {
        failedImages,
        onImageError: failImage,
        tiktokVideoIds: resolvedTikTokIds
      }))
    }
  }

  // React.Children.toArray assigns stable positional keys without a mutable
  // counter, so the rendered output does not depend on key values.
  return React.createElement(React.Fragment, null, ...React.Children.toArray(children))
}

module.exports = PostContent

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T13:30:30.330Z","module_hash":"7856d9dfcd4af4fcd8816bdc99558b3bf4063c8a4f9c6593cc3889baa08b727f","functions":[{"id":"func/PostImage","name":"PostImage","line":23,"end_line":52,"hash":"a7bd61e03c785b7ed6ae1ef0ea15e3d025448f5772b60234f08acd4fd4160a2d"},{"id":"func/youtubeEmbedNode","name":"youtubeEmbedNode","line":55,"end_line":70,"hash":"27de76e9c677ab0e00a17ad93d945ce2446037917bd2ea9fb82a27198aeed038"},{"id":"func/xEmbedNode","name":"xEmbedNode","line":73,"end_line":88,"hash":"868cfb1e8bd5fa76a226305a6c4a3a7e02d0eb1268764c026e6594b3af4c446f"},{"id":"func/linkNode","name":"linkNode","line":92,"end_line":115,"hash":"2571e065253497089d020a86a8c851e82a3d3ed500a467ef1258d977996d2f6f"},{"id":"func/PostContent","name":"PostContent","line":117,"end_line":146,"hash":"7a3945a82d74d00660d4d9aed81d355993849b5ba14ec51f95feb7fe8ed63c97"}]}
// mutate4javascript-manifest-end
