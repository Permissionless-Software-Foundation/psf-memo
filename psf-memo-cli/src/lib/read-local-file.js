/*
  Read a local file for the file-* commands, mapping any read failure to the
  documented message.

  The reader is injected so the commands can be tested without touching disk.
  Both file-upload and file-host share this boundary, so it lives in one place
  rather than as a duplicated method on each command.
*/

export function readLocalFile (readFile, filePath) {
  try {
    return readFile(filePath)
  } catch (err) {
    throw new Error(`Cannot read file: ${filePath}`)
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T17:21:37.685Z","module_hash":"b112a48e27d72d6b46d75440291ec3756acbff362ea4363c3dfbbe5000a08a2e","functions":[{"id":"func/readLocalFile","name":"readLocalFile","line":10,"end_line":16,"hash":"1a0dccdfd7d0c0f12a0187da9b86453532abb7b614900ba7130bdcc2a5216d6a"}]}
// mutate4javascript-manifest-end
