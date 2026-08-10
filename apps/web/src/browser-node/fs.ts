/**
 * Spectral includes filesystem readers for Node, but Speccy only lints
 * documents already loaded into the browser.
 */
export function readFile(
  _path: string,
  _encoding: string,
  callback: (error: Error, data?: never) => void,
) {
  callback(new Error('Filesystem references are unavailable in the browser.'));
}
