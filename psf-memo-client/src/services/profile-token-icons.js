/*
  Profile token icons view model.

  Builds the small SLP token icon view models shown in the profile sidebar
  from the SLP tokens held by a profile address. Each icon prefers the token's
  mutable-data image (an http fullSizedUrl wins over the tokenIcon) and falls
  back to a jdenticon derived from the token id. The view model is pure so the
  React shell and the Node acceptance adapter share the same decisions.
*/

const TOKENTIGER_BASE = 'https://explorer.tokentiger.com/?tokenid='

// The Tokentiger explorer page for a token id.
function tokenExplorerUrl (tokenId) {
  return `${TOKENTIGER_BASE}${tokenId}`
}

function isHttpUrl (url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

// The image URL from a token's mutable data. An http fullSizedUrl wins; then
// the tokenIcon. Anything else falls back to a jdenticon (null).
function tokenIconUrl (token = {}) {
  const mutableData = token.mutableData || {}
  if (isHttpUrl(mutableData.fullSizedUrl)) return mutableData.fullSizedUrl
  return mutableData.tokenIcon || null
}

// The accessible label for a token: its ticker, its name, or the token id.
function tokenLabel (token = {}) {
  return token.ticker || token.name || token.tokenId
}

// The view model for one token icon.
function buildTokenIcon (token = {}) {
  const imageUrl = tokenIconUrl(token)
  return {
    tokenId: token.tokenId,
    label: tokenLabel(token),
    imageUrl,
    isJdenticon: !imageUrl,
    explorerUrl: tokenExplorerUrl(token.tokenId),
    tooltip: token.tokenId
  }
}

// The view models for a list of tokens.
function buildTokenIcons (tokens = []) {
  return (Array.isArray(tokens) ? tokens : []).map(buildTokenIcon)
}

module.exports = {
  TOKENTIGER_BASE,
  tokenExplorerUrl,
  isHttpUrl,
  tokenIconUrl,
  tokenLabel,
  buildTokenIcon,
  buildTokenIcons
}
