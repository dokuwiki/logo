/**
 * A word mark written on a sheet.
 *
 * The font sets the text and turns it into path data; this part works out where
 * that path goes on its sheet. The text is set in named runs, and a level of
 * detail can leave runs out.
 */

import { checkCoverage, loadFont, VENDORED } from '../font.js'
import { compact, pen } from '../path.js'
import { extent } from '../plane.js'

/**
 * The type size the text is measured at before its real size is worked out.
 *
 * @type {number}
 */
const MEASURE = 100

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
   * @type {{font: string, tracking: number}}
   */
  static proportions = {
    font: VENDORED,
    tracking: 0.054,
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
   * @param {Array<{name: string, text: string}>} spec.text The word mark in
   *   reading order; runs that share a name make one element
   * @param {{x: number, y: number}} spec.at Where it sits on the sheet, in the
   *   sheet's own measure: the point across it the text is centred on, and how
   *   far down it the text starts
   * @param {number} spec.size How much of the sheet's width to fill, from 0 to 1
   * @param {string} spec.fill Ink colour
   * @param {{colour: string, width: number}} [spec.stroke] An outline on the
   *   letters, for a mark that has to carry more weight than the font gives it
   * @param {string[]} [spec.draws] Which parts to draw, all of them by default
   * @param {number} [spec.fills] How much of the sheet's width the parts being
   *   drawn fill, as much as the whole word mark by default
   * @param {string} [spec.font] Font file to set the text from
   * @param {number} [spec.tracking] Extra space between letters, as a fraction of the type size
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
    const text = this.text.map((part) => part.text).join('')
    checkCoverage(font, text, this.font)
    const options = { kerning: true, letterSpacing: this.tracking }

    // set once to measure, then again at the size and place it wants
    const box = font.getPath(text, 0, 0, MEASURE, options).getBoundingBox()
    const wanted = this.size * this.sheet.width
    const type = (MEASURE * wanted) / (box.x2 - box.x1)
    const scale = type / MEASURE
    const left = this.at.x - wanted / 2 - box.x1 * scale
    const top = this.at.y - box.y1 * scale

    const glyphs = font.getPaths(text, left, top, type, options)
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
    const outline = this.stroke
      ? { stroke: this.stroke.colour, 'stroke-width': this.stroke.width, 'stroke-linejoin': 'round' }
      : {}
    return drawn.map((name) => ({
      tag: 'path',
      attrs: {
        id: `${this.id}-${name}`,
        fill: this.fill,
        ...outline,
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

    for (const part of this.text) {
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
    const target = (this.fills ?? this.size) * this.sheet.width
    const factor = target / (box.x2 - box.x1)

    // centred on the same point across the sheet, starting the same way down it
    const across = this.at.x - target / 2 - box.x1 * factor
    const down = this.at.y - box.y1 * factor

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
    return compact(path.toString())
  }
}
