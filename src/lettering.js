/**
 * A word mark written on a sheet.
 *
 * opentype.js sets the text from a font and turns it into path data; this
 * component works out where that path goes on its sheet. The text is set in
 * named parts, and a level of detail can leave parts out.
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
 * The one box that holds all of the given ones.
 *
 * @param {Array<{x1: number, y1: number, x2: number, y2: number}>} boxes The boxes
 * @returns {{x1: number, y1: number, x2: number, y2: number}} Their extent
 */
function extent(boxes) {
  return {
    x1: Math.min(...boxes.map((box) => box.x1)),
    y1: Math.min(...boxes.map((box) => box.y1)),
    x2: Math.max(...boxes.map((box) => box.x2)),
    y2: Math.max(...boxes.map((box) => box.y2)),
  }
}

/**
 * Text set across a sheet.
 */
export class Wordmark {
  /**
   * How the word mark is set, used unless it is given its own.
   *
   * The original was drawn in Arial Bold. Liberation Sans Bold carries the same
   * metrics.
   *
   * @type {{font: string, tracking: number, fill: string}}
   */
  static proportions = {
    font: VENDORED,
    tracking: 0.054,
    fill: INK,
  }

  /**
   * Write on a sheet.
   *
   * The text is placed and sized in fractions of the sheet, so it follows the
   * sheet wherever the sheet goes.
   *
   * @param {import('./sheet.js').Sheet} sheet Sheet to write on
   * @param {object} spec What to write and where
   * @param {string} spec.id Element id, used as a prefix for the parts
   * @param {Array<{name: string, text: string}>} spec.parts The word mark in
   *   reading order; runs that share a name make one element
   * @param {number} spec.width How much of the sheet's width to fill, from 0 to 1
   * @param {number} spec.top How far down the sheet to start, from 0 to 1
   * @param {string[]} [spec.draws] Which parts to draw, all of them by default
   * @param {number} [spec.fills] How much of the sheet's width the parts being
   *   drawn fill, as much as the whole word mark by default
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
   * The word mark as drawable elements, one per part being drawn.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One path per part
   * @throws {Error} If the font sets the text as some other number of glyphs,
   *   or if a part being drawn is not one of the word mark's own
   */
  elements() {
    const font = loadFont(this.font)
    const text = this.parts.map((part) => part.text).join('')
    checkCoverage(font, text, this.font)
    const options = { kerning: true, letterSpacing: this.tracking }

    // set once to measure, then again at the size and place it wants
    const box = font.getPath(text, 0, 0, MEASURE, options).getBoundingBox()
    const wanted = this.width * this.sheet.width
    const size = (MEASURE * wanted) / (box.x2 - box.x1)
    const scale = size / MEASURE
    const left = (this.sheet.width - wanted) / 2 - box.x1 * scale
    const top = this.top * this.sheet.height - box.y1 * scale

    const glyphs = font.getPaths(text, left, top, size, options)
    if (glyphs.length !== text.length) {
      throw new Error(`${this.font} sets ${text} as ${glyphs.length} shapes, so they cannot be shared out one per letter`)
    }

    const parts = this.share(glyphs)
    const drawn = this.draws ?? [...parts.keys()]
    for (const name of drawn) {
      if (!parts.has(name)) throw new Error(`the word mark has no part called ${name}`)
    }
    if (!drawn.length) return []

    const place = this.placed(extent(drawn.flatMap((name) => parts.get(name).boxes)))
    return drawn.map((name) => ({
      tag: 'path',
      attrs: {
        id: `${this.id}-${name}`,
        fill: this.fill,
        transform: place,
        d: this.trace(parts.get(name).commands),
      },
    }))
  }

  /**
   * Share the glyphs out among the parts they belong to.
   *
   * The whole word mark is set in one run, so its letters are spaced as one
   * piece of text however the parts are divided up.
   *
   * @param {Array<object>} glyphs One outline per letter, in reading order
   * @returns {Map<string, {commands: Array, boxes: Array}>} Each part, in the
   *   order it first appears
   */
  share(glyphs) {
    const parts = new Map()
    let taken = 0

    for (const part of this.parts) {
      const mine = glyphs.slice(taken, taken + part.text.length)
      taken += part.text.length
      const found = parts.get(part.name) ?? { commands: [], boxes: [] }
      found.commands.push(...mine.flatMap((glyph) => glyph.commands))
      found.boxes.push(...mine.map((glyph) => glyph.getBoundingBox()))
      parts.set(part.name, found)
    }

    return parts
  }

  /**
   * Where the parts being drawn end up: the sheet's own frame, grown so that
   * what is drawn fills the width it is meant to.
   *
   * The outlines stay in the sheet's own measure, so this one value carries
   * where the word mark sits and how much the drawn parts had to grow.
   *
   * @param {{x1: number, y1: number, x2: number, y2: number}} box What is
   *   being drawn, measured across and down the sheet
   * @returns {string} Value for a transform attribute
   */
  placed(box) {
    const target = (this.fills ?? this.width) * this.sheet.width
    const factor = target / (box.x2 - box.x1)

    // centred across the sheet, hanging the same fraction of its height down
    const across = (this.sheet.width - target) / 2 - box.x1 * factor
    const down = this.top * this.sheet.height - box.y1 * factor

    return this.sheet.frame.matrix(factor, across, down)
  }

  /**
   * The glyph outlines as path data, in the sheet's own measure.
   *
   * The letters arrive lying flat, measured across and down the sheet, and stay
   * that way, so the same outlines serve a sheet at any tilt and any size.
   *
   * @param {Array<object>} commands The outlines as the font gives them
   * @returns {string} Path data
   */
  trace(commands) {
    const path = pen()
    for (const step of commands) {
      if (step.type === 'M') path.moveTo(step.x, step.y)
      else if (step.type === 'L') path.lineTo(step.x, step.y)
      else if (step.type === 'Q') path.quadraticCurveTo(step.x1, step.y1, step.x, step.y)
      else if (step.type === 'C') path.bezierCurveTo(step.x1, step.y1, step.x2, step.y2, step.x, step.y)
      else if (step.type === 'Z') path.closePath()
    }
    return path.toString()
  }
}
