/*
  Shared rendering for a hosted file's links.

  file-check (a paid invoice) and file-host (a confirmed upload) both report the
  same CID, download/view links, and one gateway link per reported gateway. This
  module single-sources that block; callers append any extra lines, such as the
  payment transaction.
*/

// The CID, download/view links, and one Gateway URL line per reported gateway,
// in that order.
export function hostedResultLines (result = {}) {
  const lines = [
    `CID: ${result.cid}`,
    `Download URL: ${result.downloadUrl}`,
    `View URL: ${result.viewUrl}`
  ]

  for (const url of result.gatewayUrls || []) {
    lines.push(`Gateway URL: ${url}`)
  }

  return lines
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:40:47.256Z","module_hash":"f1d7c2b0e7e3840a0679c7b6987edc80ca1531f4af822decb20f820c38de8a85","functions":[{"id":"func/hostedResultLines","name":"hostedResultLines","line":12,"end_line":24,"hash":"87fe1c63ea87a9f2aab26df8abc3e2a87c80f3d55333c8469c80e579ae0c0d3f"}]}
// mutate4javascript-manifest-end
