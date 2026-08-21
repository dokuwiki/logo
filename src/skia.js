/**
 * Skia, started up once for whatever needs it.
 *
 * Two things in this build ask for geometry not worth writing by hand: turning a
 * stroke into the shape it covers, and taking one shape out of another. Skia does
 * both, and loading it here gives both the one copy of it.
 *
 * It is awaited here rather than wherever it is used, so that everything reaching
 * for it stays ordinary and synchronous.
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import CanvasKitInit from 'canvaskit-wasm'

/**
 * Where the Skia build keeps its WebAssembly, which its loader has to be told.
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
