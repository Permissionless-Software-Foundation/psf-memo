/*
  Pure state transition for tracking post images that failed to load.

  This is kept free of React and the DOM so the transition can be unit tested
  directly. The PostContent component uses it as the reducer for its
  failed-image state.
*/

/**
 * Add a failed image URL to the set. Returns the same set when the URL is
 * already present, so React can bail out of a no-op update; otherwise returns
 * a new set containing the added URL. The input set is never mutated.
 */
function addFailedImage (failedImages, href) {
  if (failedImages.has(href)) return failedImages
  const next = new Set(failedImages)
  next.add(href)
  return next
}

module.exports = { addFailedImage }
