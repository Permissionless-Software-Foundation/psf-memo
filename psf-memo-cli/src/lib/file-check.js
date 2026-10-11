/*
  Pure helper for the file-check command.

  The command looks up a hosting payment by address and reports the result.
  A paid invoice carries the CID and links a caller needs to recover a hosted
  file; an unpaid invoice carries the amounts received/required and the quote
  expiry; an expired invoice is just its status. This module owns the
  human-readable rendering; the command is a thin wiring layer over the shared
  reporter and the hosting API adapter.
*/

// Local libraries
import { hostedResultLines } from './hosted-result.js'

export function formatFileCheckMessage (result = {}) {
  if (result.status === 'paid') {
    return formatPaidMessage(result)
  }

  if (result.status === 'unpaid') {
    return formatUnpaidMessage(result)
  }

  return `Status: ${result.status}`
}

// A paid invoice exposes its CID, download/view links, and gateway links.
function formatPaidMessage (result) {
  return hostedResultLines(result).join('\n')
}

// An unpaid invoice shows how much has been received, how much is required,
// and when the quote expires.
function formatUnpaidMessage (result) {
  return [
    'Status: unpaid',
    `Received: ${result.receivedSats} satoshis`,
    `Required: ${result.requiredSats} satoshis`,
    `Quote expires: ${result.quoteExpiresAt}`
  ].join('\n')
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:41:11.879Z","module_hash":"cac9fc4e40b46060cc840e9565ca2ee7d17bbebcef02cf57c056f400adaece42","functions":[{"id":"func/formatFileCheckMessage","name":"formatFileCheckMessage","line":15,"end_line":25,"hash":"db40e57fd997c263744df8701c7cd8f5f43802b0ba378e346801091655305228"},{"id":"func/formatPaidMessage","name":"formatPaidMessage","line":28,"end_line":30,"hash":"65ffc6fbb2688777e83c8a8db5f21e0aa7e98d3f42d358ac5d281fecca8d0a27"},{"id":"func/formatUnpaidMessage","name":"formatUnpaidMessage","line":34,"end_line":41,"hash":"a6d06890c03434ddba0c8031ca06d95a3065855e989c1214fadd47f5add08f76"}]}
// mutate4javascript-manifest-end
