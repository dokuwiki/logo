/**
 * A rounded rectangle.
 *
 * A rectangle knows where its own edges and corners are, and offers them in its
 * own measure, so a part made from one follows it wherever it goes.
 */

import { Frame } from './frame.js'

/**
 * One rounded rectangle, placed by its top left corner and turned about it.
 */
export class Rectangle {
  /**
   * What a design can tell a rectangle, besides where it is placed and whether
   * it is drawn, which every part is told the same way.
   *
   * @type {string[]}
   */
  static takes = ['id', 'at', 'turn', 'size', 'radius', 'fill', 'stroke']

  /**
   * Place a rectangle.
   *
   * @param {object} spec Where the rectangle goes
   * @param {string} spec.id Element id
   * @param {{x: number, y: number}} spec.at Top left corner
   * @param {number} spec.turn How far it is turned, in degrees
   * @param {{w: number, h: number}} spec.size Width and height before turning
   * @param {number} spec.radius Corner radius
   * @param {string} spec.fill Fill colour
   * @param {{colour: string, width: number}} [spec.stroke] Outline, for a shape
   *   that needs its edge shown against a pale surface
   */
  constructor({ id, at, turn, size, radius, fill, stroke }) {
    /** @type {string} Element id */
    this.id = id
    /** @type {number} How far it is turned, in degrees */
    this.turn = turn
    /** @type {number} Width before turning */
    this.width = size.w
    /** @type {number} Height before turning */
    this.height = size.h
    /** @type {number} Corner radius */
    this.radius = radius
    /** @type {string} Fill colour */
    this.fill = fill
    /** @type {{colour: string, width: number}|undefined} Outline */
    this.stroke = stroke
    /** @type {Frame} Its own frame, running across then down */
    this.frame = new Frame(at, turn)
  }

  /**
   * Unit direction across the rectangle.
   *
   * @returns {import('../plane.js').Point} Direction
   */
  get across() {
    return this.frame.axis
  }

  /**
   * Unit direction down the rectangle.
   *
   * @returns {import('../plane.js').Point} Direction
   */
  get down() {
    return this.frame.side
  }

  /**
   * A point on the rectangle, given as fractions of its width and height.
   *
   * @param {number} u Fraction across, 0 at the left edge and 1 at the right
   * @param {number} v Fraction down, 0 at the top edge and 1 at the bottom
   * @returns {import('../plane.js').Point} The point
   */
  at(u, v) {
    return this.frame.at(u * this.width, v * this.height)
  }

  /**
   * One of the rectangle's four edges.
   *
   * @param {'left'|'right'|'top'|'bottom'} name Which edge
   * @returns {{from: import('../plane.js').Point,
   *   along: import('../plane.js').Point,
   *   outward: import('../plane.js').Point, length: number}} Where the edge
   *   starts, the direction along it, the direction out of the rectangle, and
   *   how long it is
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
   * A point on one of the rectangle's edges.
   *
   * @param {{edge: 'left'|'right'|'top'|'bottom', along: number}} place Which
   *   edge, and how far along it, from 0 to 1
   * @returns {import('../plane.js').Point} The point
   */
  onEdge(place) {
    const edge = this.edge(place.edge)
    return edge.from.add(edge.along.mult(place.along * edge.length))
  }

  /**
   * Another rectangle laid in this one's frame, so it follows wherever this one
   * goes. It is cut to this rectangle's own measure unless it is given one. It
   * is drawn where the design lists it, before this one or after.
   *
   * @param {object} spec Where it goes
   * @param {string} spec.id Element id
   * @param {{x: number, y: number}} spec.at Its top left corner, in this
   *   rectangle's frame
   * @param {number} spec.turn How much further it is turned, in degrees
   * @param {string} spec.fill Fill colour
   * @param {{w: number, h: number}} [spec.size] Width and height before turning
   * @param {number} [spec.radius] Corner radius
   * @param {{colour: string, width: number}} [spec.stroke] Outline
   * @returns {Rectangle} The rectangle laid in this one
   */
  rectangle(spec) {
    return new Rectangle({
      ...spec,
      at: this.frame.at(spec.at.x, spec.at.y),
      turn: this.turn + spec.turn,
      size: spec.size ?? { w: this.width, h: this.height },
      radius: spec.radius ?? this.radius,
    })
  }

  /**
   * The rectangle as drawable elements.
   *
   * The rect is drawn at the frame's origin and placed by the frame itself, so
   * one attribute carries where it is and how far it is turned.
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
