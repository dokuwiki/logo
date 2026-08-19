/**
 * A sheet of paper.
 *
 * A sheet knows where its own edges and corners are, and the things that lie on
 * it are made from it, so they follow wherever the sheet goes.
 */

import { Frame } from '../frame.js'
import { Arrow } from './arrow.js'
import { Wordmark } from './wordmark.js'

/**
 * One sheet of paper, placed by its top left corner and turned about it.
 */
export class Sheet {
  /**
   * Place a sheet.
   *
   * @param {object} spec Where the sheet goes
   * @param {string} spec.id Element id
   * @param {{x: number, y: number}} spec.at Top left corner
   * @param {number} spec.turn How far the sheet is turned, in degrees
   * @param {{w: number, h: number}} spec.size Width and height before turning
   * @param {number} spec.radius Corner radius
   * @param {string} spec.fill Paper colour
   * @param {{colour: string, width: number}} [spec.stroke] Outline, for a sheet
   *   that needs its edge shown against a pale surface
   */
  constructor({ id, at, turn, size, radius, fill, stroke }) {
    /** @type {string} Element id */
    this.id = id
    /** @type {number} How far the sheet is turned, in degrees */
    this.turn = turn
    /** @type {number} Width before turning */
    this.width = size.w
    /** @type {number} Height before turning */
    this.height = size.h
    /** @type {number} Corner radius */
    this.radius = radius
    /** @type {string} Paper colour */
    this.fill = fill
    /** @type {{colour: string, width: number}|undefined} Outline */
    this.stroke = stroke
    /** @type {Frame} The sheet's own frame, running across then down */
    this.frame = new Frame(at, turn)
  }

  /**
   * Unit direction across the sheet.
   *
   * @returns {import('../plane.js').Point} Direction
   */
  get across() {
    return this.frame.axis
  }

  /**
   * Unit direction down the sheet.
   *
   * @returns {import('../plane.js').Point} Direction
   */
  get down() {
    return this.frame.side
  }

  /**
   * A point on the sheet, given as fractions of its width and height.
   *
   * @param {number} u Fraction across, 0 at the left edge and 1 at the right
   * @param {number} v Fraction down, 0 at the top edge and 1 at the bottom
   * @returns {import('../plane.js').Point} The point
   */
  at(u, v) {
    return this.frame.at(u * this.width, v * this.height)
  }

  /**
   * One of the sheet's four edges.
   *
   * @param {'left'|'right'|'top'|'bottom'} name Which edge
   * @returns {{from: import('../plane.js').Point,
   *   along: import('../plane.js').Point,
   *   outward: import('../plane.js').Point, length: number}} Where the edge
   *   starts, the direction along it, the direction out of the sheet, and how
   *   long it is
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
   * @returns {import('../plane.js').Point} The point
   */
  onEdge(name, fraction) {
    const edge = this.edge(name)
    return edge.from.add(edge.along.mult(fraction * edge.length))
  }

  /**
   * Another sheet tucked behind this one, offset and turned in this sheet's
   * frame so it follows wherever this sheet goes. It is cut to this sheet's own
   * measure unless it is given one.
   *
   * @param {object} spec Where it peeks out
   * @param {string} spec.id Element id
   * @param {{x: number, y: number}} spec.at How far it sits to the right and
   *   down, in this sheet's frame
   * @param {number} spec.turn How much further it is turned, in degrees
   * @param {string} spec.fill Paper colour
   * @param {{w: number, h: number}} [spec.size] Width and height before turning
   * @param {number} [spec.radius] Corner radius
   * @param {{colour: string, width: number}} [spec.stroke] Outline
   * @returns {Sheet} The sheet behind
   */
  behind(spec) {
    return new Sheet({
      ...spec,
      at: this.frame.at(spec.at.x, spec.at.y),
      turn: this.turn + spec.turn,
      size: spec.size ?? { w: this.width, h: this.height },
      radius: spec.radius ?? this.radius,
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
   * one attribute carries where the sheet is and how far it is turned.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One rect
   */
  elements() {
    const outline = this.stroke ? { stroke: this.stroke.colour, 'stroke-width': this.stroke.width } : {}
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
