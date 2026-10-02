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

// Resolve each not-yet-attempted short link once, calling `onResolved(url,
// videoId)` for every successful resolution. `attempted` is a Set recording the
// URLs already requested (across effect runs). Returns a cancel function that
// suppresses callbacks from an in-flight run. Extracted from the React effect
// so the orchestration is unit testable without a renderer.
function resolveShortLinks (shortLinks, attempted, resolveTikTok, onResolved) {
  if (typeof resolveTikTok !== 'function') return () => {}

  const request = { cancelled: false }
  for (const url of shortLinks) {
    if (attempted.has(url)) continue
    attempted.add(url)
    Promise.resolve(resolveTikTok(url))
      .then((videoId) => {
        if (request.cancelled || !videoId) return
        onResolved(url, String(videoId))
      })
      .catch(() => {})
  }

  return () => { request.cancelled = true }
}

// Resolve the post's TikTok short links to video ids in the background.  The
// initial map (used by tests and acceptance) is seeded synchronously; each
// unresolved short link is fetched at most once per component instance.
function useResolvedTikTokIds (shortLinks, initialIds, resolveTikTok) {
  const [resolved, setResolved] = React.useState(() => ({ ...(initialIds || {}) }))
  const attempted = React.useRef(new Set(Object.keys(initialIds || {})))
  const shortLinksKey = shortLinks.join('\n')

  React.useEffect(() => {
    const urls = shortLinksKey ? shortLinksKey.split('\n') : []
    return resolveShortLinks(urls, attempted.current, resolveTikTok, (url, videoId) => {
      setResolved((previous) => ({ ...previous, [url]: videoId }))
    })
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

PostContent.resolveShortLinks = resolveShortLinks

module.exports = PostContent

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T14:11:51.950Z","module_hash":"338db4c69e83aa7e9869e3c151f63669abbfce873f590b3ce349f443bc2828de","functions":[{"id":"func/PostImage","name":"PostImage","line":29,"end_line":58,"hash":"a7bd61e03c785b7ed6ae1ef0ea15e3d025448f5772b60234f08acd4fd4160a2d"},{"id":"func/youtubeEmbedNode","name":"youtubeEmbedNode","line":61,"end_line":76,"hash":"27de76e9c677ab0e00a17ad93d945ce2446037917bd2ea9fb82a27198aeed038"},{"id":"func/xEmbedNode","name":"xEmbedNode","line":79,"end_line":94,"hash":"868cfb1e8bd5fa76a226305a6c4a3a7e02d0eb1268764c026e6594b3af4c446f"},{"id":"func/tiktokEmbedNode","name":"tiktokEmbedNode","line":97,"end_line":112,"hash":"f6aeb209025abcf366787b5414d49013c829c9fd24f4864679a6a3e7bff08dd6"},{"id":"func/collectTikTokShortLinks","name":"collectTikTokShortLinks","line":116,"end_line":127,"hash":"302d93758b2c319553a38ba8d7934b4ffbe48fb1f82d434f0c9213f3e7ed3119"},{"id":"func/resolveShortLinks","name":"resolveShortLinks","line":134,"end_line":150,"hash":"27edf41a5944171cfeccc4c840652adef656fdc6b1307eecea63f0efd6f84931"},{"id":"func/useResolvedTikTokIds","name":"useResolvedTikTokIds","line":155,"end_line":168,"hash":"6ebb3697f46e5f815682de8ca641203e3493686da86e13fbbd842edf973464a8"},{"id":"func/linkNode","name":"linkNode","line":172,"end_line":199,"hash":"9c40d9f59d8548575e52e9069c0f223e9878f223d9b34ab9bf243fe001b2ad9b"},{"id":"func/PostContent","name":"PostContent","line":201,"end_line":241,"hash":"c1d642d79cd0325ea3ef4809c8324c8561760cb2ade96eb50d9e7698198d1ad8"}]}
// mutate4javascript-manifest-end
