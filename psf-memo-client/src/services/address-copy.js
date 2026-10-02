/*
  Transient address-copy confirmation shared by the profile and account page
  controllers.

  Clicking the sidebar address copies it to the clipboard and shows a
  confirmation for a short interval. These helpers own the confirmation flag
  and its reset timer so the two pages do not duplicate the scheduling logic;
  the page supplies the clipboard adapter, the change listener, and the timer
  functions.
*/

// Set the confirmation flag and notify the page's listener (the React shell).
function setAddressCopied (page, copied) {
  page.addressCopied = copied
  if (page.onAddressCopyChange) page.onAddressCopyChange(copied)
}

// Restart the timer that clears the confirmation after the given delay.
function scheduleAddressCopyReset (page, delayMs) {
  clearAddressCopyTimer(page)
  page.addressCopyTimer = page.setTimer(() => {
    page.addressCopyTimer = null
    setAddressCopied(page, false)
  }, delayMs)
}

// Stop the pending confirmation timer without changing the confirmation flag.
function clearAddressCopyTimer (page) {
  if (page.addressCopyTimer !== null) {
    page.clearTimer(page.addressCopyTimer)
    page.addressCopyTimer = null
  }
}

module.exports = {
  setAddressCopied,
  scheduleAddressCopyReset,
  clearAddressCopyTimer
}
