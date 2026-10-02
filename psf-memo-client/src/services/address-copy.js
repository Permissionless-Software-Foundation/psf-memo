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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:07:44.574Z","module_hash":"9d0b452863dd00d0ea1f10ef8ecedb49306e47f77f0e5b63731fffc4cc82d964","functions":[{"id":"func/setAddressCopied","name":"setAddressCopied","line":13,"end_line":16,"hash":"7599098ebc7ae60a6891b0653efcb5ac8d03d55377a56dc16807bdadf44aedb4"},{"id":"func/scheduleAddressCopyReset","name":"scheduleAddressCopyReset","line":19,"end_line":25,"hash":"b7a9542b46e2fa7164ac4aa268c9038b91454099a5fb34b9eb5f12a5f04173b6"},{"id":"func/clearAddressCopyTimer","name":"clearAddressCopyTimer","line":28,"end_line":33,"hash":"4dcd894b5269437ca9cf1677e175cdfe795a10dbf80c5cf501292ae409e61bcc"}]}
// mutate4javascript-manifest-end
