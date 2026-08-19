/**
 * A sheet of paper.
 *
 * A sheet knows where its own edges and corners are, and the things that live
 * on it are made from it: another sheet tucked behind, an arrow coming out
 * from behind an edge, a word mark written across it.
 */

import { Frame } from './frame.js'
import { Arrow } from './arrow.js'
import { Wordmark } from './lettering.js'
import { PAPER } from './palette.js'

/**
 * One sheet of paper, placed by its top left corner and turned about it.
 */
export class Sheet {
  /**
   * Proportions of a sheet, used unless a sheet is given its own.
   *
   * The paper is a shade smaller than the space it is drawn in. An outline sits
   * half outside the edge it follows, so a sheet as large as the canvas would
   * have that half cut off, and md draws the heaviest outline of the levels
   * that show the whole fan.
   *
   * @type {{width: number, height: number, radius: number}}
   */
  static proportions = { width: 664, height: 842, radius: 29 }

  /**
   * Place a sheet.
   *
   * @param {object} spec Where the sheet goes
   * @param {string} spec.id Element id
   * @param {{x: number, y: number}} spec.corner Top left corner
   * @param {number} spec.tilt How far the sheet is turned, in degrees
   * @param {string} [spec.fill] Paper colour
   * @param {string} [spec.stroke] Outline colour, for a sheet that needs its
   *   edge shown against a pale surface
   * @param {number} [spec.strokeWidth] Outline width
   * @param {number} [spec.width] Width before tilting
   * @param {number} [spec.height] Height before tilting
   * @param {number} [spec.radius] Corner radius
   */
  constructor(spec) {
    const { id, corner, tilt, fill = PAPER, stroke, strokeWidth, ...rest } = { ...Sheet.proportions, ...spec }
    /** @type {string} Element id */
    this.id = id
    /** @type {number} How far the sheet is turned, in degrees */
    this.tilt = tilt
    /** @type {string} Paper colour */
    this.fill = fill
    /** @type {string|undefined} Outline colour */
    this.stroke = stroke
    /** @type {number|undefined} Outline width */
    this.strokeWidth = strokeWidth
    /** @type {number} Width before tilting */
    this.width = rest.width
    /** @type {number} Height before tilting */
    this.height = rest.height
    /** @type {number} Corner radius */
    this.radius = rest.radius
    /** @type {Frame} The sheet's own frame, running across then down */
    this.frame = new Frame(corner, tilt)
  }

  /**
   * Unit direction across the sheet.
   *
   * @returns {import('./plane.js').Point} Direction
   */
  get across() {
    return this.frame.axis
  }

  /**
   * Unit direction down the sheet.
   *
   * @returns {import('./plane.js').Point} Direction
   */
  get down() {
    return this.frame.side
  }

  /**
   * A point on the sheet, given as fractions of its width and height.
   *
   * @param {number} u Fraction across, 0 at the left edge and 1 at the right
   * @param {number} v Fraction down, 0 at the top edge and 1 at the bottom
   * @returns {import('./plane.js').Point} The point
   */
  at(u, v) {
    return this.frame.at(u * this.width, v * this.height)
  }

  /**
   * One of the sheet's four edges.
   *
   * @param {'left'|'right'|'top'|'bottom'} name Which edge
   * @returns {{from: object, along: object, outward: object, length: number}} The edge
   */
  edge(name) {
    const sides = {
      left: { corner: [0, 0], along: this.down, outward: this.across.mult(-1), length: this.height },
      right: { corner: [1, 0], along: this.down, outward: this.across, length: this.height },
      top: { corner: [0, 0], along: this.across, outward: this.down.mult(-1), length: this.width },
      bottom: { corner: [0, 1], along: this.across, outward: this.down, length: this.width },
    }
    const side = sides[name]
    if (!side) throw new Error(`no such edge: ${name}`)
    return { from: this.at(...side.corner), along: side.along, outward: side.outward, length: side.length }
  }

  /**
   * A point on one of the sheet's edges.
   *
   * @param {'left'|'right'|'top'|'bottom'} name Which edge
   * @param {number} fraction How far along the edge, from 0 to 1
   * @returns {import('./plane.js').Point} The point
   */
  onEdge(name, fraction) {
    const edge = this.edge(name)
    return edge.from.add(edge.along.mult(fraction * edge.length))
  }

  /**
   * Another sheet tucked behind this one, offset and turned in this sheet's
   * frame so it follows wherever this sheet goes.
   *
   * @param {object} offset Where it peeks out
   * @param {string} offset.id Element id
   * @param {number} offset.tilt How much further it is turned, in degrees
   * @param {number} offset.x How far it sits to the right, in this sheet's frame
   * @param {number} offset.y How far it sits down, in this sheet's frame
   * @param {string} [offset.fill] Paper colour
   * @param {string} [offset.stroke] Outline colour
   * @param {number} [offset.strokeWidth] Outline width
   * @returns {Sheet} The sheet behind
   */
  behind({ id, tilt, x, y, fill, stroke, strokeWidth }) {
    return new Sheet({
      id,
      corner: this.frame.at(x, y),
      tilt: this.tilt + tilt,
      fill,
      stroke,
      strokeWidth,
      width: this.width,
      height: this.height,
      radius: this.radius,
    })
  }

  /**
   * An arrow coming out from behind one of this sheet's edges.
   *
   * @param {object} spec What the arrow does, see Arrow
   * @returns {Arrow} The arrow
   */
  arrow(spec) {
    return new Arrow(this, spec)
  }

  /**
   * A word mark written across this sheet.
   *
   * @param {object} spec What to write, see Wordmark
   * @returns {Wordmark} The word mark
   */
  write(spec) {
    return new Wordmark(this, spec)
  }

  /**
   * The sheet as drawable elements.
   *
   * The rect is drawn at the frame's origin and placed by the frame itself, so
   * where the sheet is and how far it is turned are one attribute rather than
   * three.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One rect
   */
  elements() {
    const outline = this.stroke ? { stroke: this.stroke, 'stroke-width': this.strokeWidth } : {}
    return [
      {
        tag: 'rect',
        attrs: {
          id: this.id,
          width: this.width,
          height: this.height,
          rx: this.radius,
          transform: this.frame.matrix(),
          fill: this.fill,
          ...outline,
        },
      },
    ]
  }
}
