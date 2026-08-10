/**
 * Minimal Buffer compatibility for Spectral's YAML binary tag support.
 */
export class Buffer extends Uint8Array {
  static isBuffer(value: unknown): value is Buffer {
    return value instanceof Buffer;
  }
}
