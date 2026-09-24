/*
  Profile token icons view model.

  Builds the small SLP token icon view models shown in the profile sidebar
  from the SLP tokens held by a profile address. Each icon prefers the token's
  mutable-data image (an http fullSizedUrl wins over the tokenIcon) and falls
  back to a jdenticon derived from the token id. The view model is pure so the
  React shell and the Node acceptance adapter share the same decisions.
*/

const { tokenIconFromMutableData } = require('./token-mutable-data')

const TOKENTIGER_BASE = 'https://explorer.tokentiger.com/?tokenid='

// The Tokentiger explorer page for a token id.
function tokenExplorerUrl (tokenId) {
  return `${TOKENTIGER_BASE}${tokenId}`
}

// The image URL from a token's resolved mutable-data record. An http
// fullSizedUrl wins; then the tokenIcon. Anything else falls back to a
// jdenticon (null).
function tokenIconUrl (token = {}) {
  return tokenIconFromMutableData(token.mutableData)
}

// The accessible label for a token: its ticker, its name, or the token id.
function tokenLabel (token = {}) {
  return token.ticker || token.name || token.tokenId
}

// The view model for one token icon. The tooltip is the token id until the
// token's genesis name is retrieved, then the genesis name.
function buildTokenIcon (token = {}) {
  const imageUrl = tokenIconUrl(token)
  return {
    tokenId: token.tokenId,
    label: tokenLabel(token),
    imageUrl,
    isJdenticon: !imageUrl,
    explorerUrl: tokenExplorerUrl(token.tokenId),
    tooltip: token.genesisName || token.tokenId
  }
}

// The view models for a list of tokens.
function buildTokenIcons (tokens = []) {
  return (Array.isArray(tokens) ? tokens : []).map(buildTokenIcon)
}

module.exports = {
  TOKENTIGER_BASE,
  tokenExplorerUrl,
  tokenIconUrl,
  tokenLabel,
  buildTokenIcon,
  buildTokenIcons
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-09-24T02:43:13.159Z","module_hash":"6065c4b841bb542d8a5bbe2391fd34952d0b6c214c29580d1a6e472caf0c0e67","functions":[{"id":"func/tokenExplorerUrl","name":"tokenExplorerUrl","line":16,"end_line":18,"hash":"589e1b0f1174ce1d57b3fc78e2dd71c2d89fd844dc4efd32eb8941c1a93ecfe3"},{"id":"func/tokenIconUrl","name":"tokenIconUrl","line":23,"end_line":25,"hash":"e3afd2790eae03ad6722edf7d6c822aac418d441557df0cfbe64c40d0c82807a"},{"id":"func/tokenLabel","name":"tokenLabel","line":28,"end_line":30,"hash":"79fa9df4dd49b69ba826a19a0e7eac2d0d9a5112addc3e86db68a90a197bd5e0"},{"id":"func/buildTokenIcon","name":"buildTokenIcon","line":34,"end_line":44,"hash":"141733a44fcce6134dabb97b616ff00fe447c6b6cac0d895c4f63c4bec1c8301"},{"id":"func/buildTokenIcons","name":"buildTokenIcons","line":47,"end_line":49,"hash":"4e3b86293417d8098c3c2ee8a9d12e5a8c7bb3d5da4799c49eae6b2a8592b7ab"}]}
// mutate4javascript-manifest-end
