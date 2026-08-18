/**
 * A word mark written on a sheet.
 *
 * The word mark is text, so it is set from a font rather than kept as traced
 * outlines. opentype.js turns the string into path data; this component works
 * out where that path goes on its sheet.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import opentype from 'opentype.js'

import { pen } from './path.js'
import { INK } from './palette.js'

/**
 * Fonts already read from disk, so a rebuild parses each one once.
 *
 * @type {Map<string, object>}
 */
const loaded = new Map()

/**
 * The type size the text is measured at before its real size is worked out.
 *
 * @type {number}
 */
const MEASURE = 100

/**
 * The font that ships with this repository, so a build draws the same letters
 * wherever it runs.
 *
 * @type {string}
 */
const VENDORED = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts', 'LiberationSans-Bold.ttf')

/**
 * Read a font file.
 *
 * @param {string} path The font file
 * @returns {object} The parsed font
 * @throws {Error} If the file is not there
 */
function loadFont(path) {
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
 * Without this a missing letter comes out as an empty box, or as nothing at
 * all, and the build says it succeeded.
 *
 * @param {object} font The parsed font
 * @param {string} text What is to be set
 * @param {string} path Where the font came from, for the message
 * @throws {Error} If a letter is missing
 */
function checkCoverage(font, text, path) {
  const missing = [...new Set(text)].filter((letter) => !font.charToGlyphIndex(letter))
  if (missing.length) {
    throw new Error(`${path} has no glyph for ${missing.map((l) => `"${l}"`).join(', ')}`)
  }
}

/**
 * Text set across a sheet.
 */
export class Wordmark {
  /**
   * How the word mark is set, used unless it is given its own.
   *
   * The lettering is Arial Bold, which the original was drawn from. Liberation
   * Sans Bold carries the same metrics and is the one that ships on Linux.
   *
   * @type {object}
   */
  static proportions = {
    font: VENDORED,
    tracking: 0.054,
    fill: INK,
  }

  /**
   * Write on a sheet.
   *
   * The text is centred across the sheet, hangs a fixed fraction of the
   * sheet's height below its top edge, and is scaled to a fraction of the
   * sheet's width. So it follows the sheet wherever the sheet goes.
   *
   * @param {import('./sheet.js').Sheet} sheet Sheet to write on
   * @param {object} spec What to write and where
   * @param {string} spec.id Element id
   * @param {string} spec.text The word mark
   * @param {number} spec.width How much of the sheet's width to fill, from 0 to 1
   * @param {number} spec.top How far down the sheet to start, from 0 to 1
   * @param {string} [spec.font] Font file to set the text from
   * @param {number} [spec.tracking] Extra space between letters, as a fraction of the type size
   * @param {string} [spec.fill] Ink colour
   */
  constructor(sheet, spec) {
    /** @type {import('./sheet.js').Sheet} Sheet to write on */
    this.sheet = sheet
    Object.assign(this, Wordmark.proportions, spec)
  }

  /**
   * The word mark as drawable elements.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One path
   */
  elements() {
    const font = loadFont(this.font)
    checkCoverage(font, this.text, this.font)
    const options = { kerning: true, letterSpacing: this.tracking }

    // set it once to find out how wide it comes out, then again at the size
    // and place it actually wants, so nothing has to be scaled afterwards
    const box = font.getPath(this.text, 0, 0, MEASURE, options).getBoundingBox()
    const wanted = this.width * this.sheet.width
    const size = (MEASURE * wanted) / (box.x2 - box.x1)
    const scale = size / MEASURE
    const left = (this.sheet.width - wanted) / 2 - box.x1 * scale
    const top = this.top * this.sheet.height - box.y1 * scale
    const drawn = font.getPath(this.text, left, top, size, options)

    return [
      {
        tag: 'path',
        attrs: { id: this.id, fill: this.fill, d: this.trace(drawn) },
      },
    ]
  }

  /**
   * Redraw the glyph outlines onto the sheet.
   *
   * The letters arrive lying flat, measured across and down the sheet. Putting
   * every point through the sheet's own frame lands them on the canvas already
   * turned, so the path needs no transform of its own.
   *
   * @param {object} drawn The outlines as the font gives them
   * @returns {string} Path data
   */
  trace(drawn) {
    const path = pen()
    const on = (x, y) => this.sheet.frame.at(x, y)
    for (const step of drawn.commands) {
      const to = on(step.x, step.y)
      if (step.type === 'M') path.moveTo(to.x, to.y)
      else if (step.type === 'L') path.lineTo(to.x, to.y)
      else if (step.type === 'Q') {
        const handle = on(step.x1, step.y1)
        path.quadraticCurveTo(handle.x, handle.y, to.x, to.y)
      } else if (step.type === 'C') {
        const first = on(step.x1, step.y1)
        const second = on(step.x2, step.y2)
        path.bezierCurveTo(first.x, first.y, second.x, second.y, to.x, to.y)
      } else if (step.type === 'Z') path.closePath()
    }
    return path.toString()
  }
}
