/**
 * Skia, started up once for whatever needs it.
 *
 * It is awaited here rather than where it is used, so everything reaching for it
 * stays ordinary and synchronous.
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import CanvasKitInit from 'canvaskit-wasm'

/**
 * Where the Skia build keeps its WebAssembly, which its loader must be told.
 *
 * @type {string}
 */
const BIN = dirname(createRequire(import.meta.url).resolve('canvaskit-wasm/bin/canvaskit.js'))

/**
 * Skia, ready to use.
 *
 * @type {object}
 */
export const skia = await CanvasKitInit({ locateFile: (file) => join(BIN, file) })
