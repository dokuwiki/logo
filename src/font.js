/**
 * Reading a font and setting text from it.
 *
 * opentype.js does the parsing and turns text into path data. This works out
 * where a font file is, reads it once, and checks it can draw what is asked of
 * it.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import opentype from 'opentype.js'

/**
 * Fonts already read from disk, so a rebuild parses each one once.
 *
 * @type {Map<string, object>}
 */
const loaded = new Map()

/**
 * The font that ships with this repository, so a build draws the same letters
 * wherever it runs.
 *
 * @type {string}
 */
export const VENDORED = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts', 'Nunito-ExtraBold.ttf')

/**
 * Read a font file.
 *
 * @param {string} path The font file
 * @returns {object} The parsed font
 * @throws {Error} If the file is not there
 */
export function loadFont(path) {
  if (!existsSync(path)) throw new Error(`no font at ${path}`)
  if (!loaded.has(path)) {
    const file = readFileSync(path)
    const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    loaded.set(path, opentype.parse(bytes))
  }
  return loaded.get(path)
}

/**
 * Check that the font can draw every letter of the text.
 *
 * @param {object} font The parsed font
 * @param {string} text What is to be set
 * @param {string} path Where the font came from, for the message
 * @throws {Error} If a letter is missing
 */
export function checkCoverage(font, text, path) {
  const missing = [...new Set(text)].filter((letter) => !font.charToGlyphIndex(letter))
  if (missing.length) {
    throw new Error(`${path} has no glyph for ${missing.map((l) => `"${l}"`).join(', ')}`)
  }
}
