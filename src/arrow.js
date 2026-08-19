/**
 * An arrow looping around a sheet.
 *
 * It starts at an edge of the sheet, against the outside of the line that draws
 * that edge, and leaves at a right angle so the flat end of the stroke lies
 * along it. It swings outward, comes back across the sheet, and ends in a head
 * pointing along the sheet's own horizontal.
 *
 * Shaft and head are two paths because they end differently: the tail is cut
 * flat against the sheet's edge, while the head's tips are round. A stroke
 * takes one cap for both of its ends, so one path cannot do both.
 */

import { outline, pen } from './path.js'
import { radians } from './plane.js'

/**
 * One arrow, made from the sheet it belongs to.
 */
export class Arrow {
  /**
   * The look every arrow shares, used unless an arrow is given its own.
   *
   * The bevel softens the corners of a solid head, and does nothing to a head
   * drawn as two strokes, whose corners are round already.
   *
   * @type {{width: number, headLength: number, headSpread: number, headBevel: number}}
   */
  static proportions = { width: 24, headLength: 98, headSpread: 34.5, headBevel: 70 }

  /**
   * Attach an arrow to a sheet.
   *
   * @param {import('./sheet.js').Sheet} sheet Sheet the arrow comes out from
   * @param {object} spec What this arrow does
   * @param {string} spec.id Element id
   * @param {string} spec.colour Stroke colour
   * @param {'left'|'right'} spec.edge Edge the tail comes out of
   * @param {number} spec.from How far down that edge the tail sits, from 0 to 1
   * @param {{u: number, v: number}} spec.to Where the head lands on the sheet
   * @param {number} spec.swing How far the loop reaches out past the edge,
   *   measured from the edge itself, so holding the tail clear of the outline
   *   does not carry the loop out with it
   * @param {number} spec.approach How straight the run into the head is
   * @param {number} [spec.width] Stroke width
   * @param {number} [spec.headLength] Length of each head arm
   * @param {number} [spec.headSpread] Angle between an arm and the shaft, in degrees
   * @param {number} [spec.headBevel] How far back from a solid head's corners
   *   the rounding starts
   * @param {string[]} [spec.draws] Which parts to draw, the shaft and the head
   *   by default
   * @param {boolean} [spec.solid] Whether the head is a filled triangle rather
    *   than two strokes, which is what it has to be where the head is all that
   *   is left of the arrow
   */
  constructor(sheet, spec) {
    /** @type {import('./sheet.js').Sheet} Sheet the arrow comes out from */
    this.sheet = sheet
    Object.assign(this, Arrow.proportions, spec)
  }

  /**
   * Where the tail meets the sheet's edge.
   *
   * It is held off the edge by half the sheet's outline, so the flat cut lands
   * against the outside of that line rather than across it. The line stays
   * whole, and the arrow reads as coming out from behind the paper.
   *
   * @returns {import('./plane.js').Point} The point
   */
  get tail() {
    const edge = this.sheet.edge(this.edge)
    const clear = (this.sheet.strokeWidth ?? 0) / 2
    return this.sheet.onEdge(this.edge, this.from).add(edge.outward.mult(clear))
  }

  /**
   * Where the head points.
   *
   * @returns {import('./plane.js').Point} The point
   */
  get tip() {
    return this.sheet.at(this.to.u, this.to.v)
  }

  /**
   * How the arrow is painted, whichever part is being drawn.
   *
   * @param {string} part What to call this part
   * @param {string} cap How its stroke ends
   * @param {string} fill What fills it, if anything
   * @param {number} width How wide its stroke is
   * @param {string} data Path data
   * @returns {{tag: string, attrs: Object}} Element
   */
  stroke(part, cap, fill, width, data) {
    return {
      tag: 'path',
      attrs: {
        id: `${this.id}-${part}`,
        fill,
        stroke: this.colour,
        'stroke-width': width,
        'stroke-linecap': cap,
        'stroke-linejoin': 'round',
        d: data,
      },
    }
  }

  /**
   * Which way the arrow reads: back along the sheet from the head.
   *
   * @returns {import('./plane.js').Point} Direction
   */
  get backwards() {
    return this.edge === 'left' ? this.sheet.across.mult(-1) : this.sheet.across
  }

  /**
   * The shaft: out from behind the sheet's edge, round and back across it.
   *
   * @returns {{tag: string, attrs: Object}} Element
   */
  shaftElement() {
    const { tail, tip, backwards } = this
    const outward = this.sheet.edge(this.edge).outward
    const swing = this.sheet.onEdge(this.edge, this.from).add(outward.mult(this.swing))
    const approach = tip.add(backwards.mult(this.approach))

    const path = pen()
    path.moveTo(tail.x, tail.y)
    path.bezierCurveTo(swing.x, swing.y, approach.x, approach.y, tip.x, tip.y)
    return this.stroke('shaft', 'butt', 'none', this.width, path.toString())
  }

  /**
   * The head: two arms meeting at the tip, or the triangle between them where
   * the head has to stand for the whole arrow.
   *
   * A solid head carries no stroke. Its corners are cut back and bridged in the
   * path itself, the way a pencil's are, because the stroke that would round
   * them also caps the arms and leaves a nub on each of the head's own corners.
   *
   * @returns {{tag: string, attrs: Object}} Element
   */
  headElement() {
    const { tip, backwards } = this
    const arm = (turn) => tip.add(backwards.rotate(radians(turn)).mult(this.headLength))
    const start = arm(-this.headSpread)
    const end = arm(this.headSpread)

    if (this.solid) {
      return this.stroke('head', 'round', this.colour, 0, outline([start, tip, end], this.headBevel))
    }

    const path = pen()
    path.moveTo(start.x, start.y)
    path.lineTo(tip.x, tip.y)
    path.lineTo(end.x, end.y)
    return this.stroke('head', 'round', 'none', this.width, path.toString())
  }

  /**
   * The arrow as drawable elements.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The parts this arrow draws
   * @throws {Error} If a part being drawn is not one of an arrow's own
   */
  elements() {
    const parts = { shaft: () => this.shaftElement(), head: () => this.headElement() }
    const drawn = this.draws ?? Object.keys(parts)
    for (const name of drawn) {
      if (!parts[name]) throw new Error(`an arrow has no part called ${name}`)
    }
    return drawn.map((name) => parts[name]())
  }
}
