/**
 * An arrow looping around a sheet.
 *
 * It starts on an edge of the sheet, leaving at a right angle so the flat end
 * of the stroke lies along that edge and the arrow reads as coming out from
 * behind the paper. It swings outward, comes back across the sheet, and ends
 * in a head pointing along the sheet's own horizontal.
 *
 * Shaft and head are two paths because they end differently: the tail is cut
 * flat against the sheet's edge, while the head's tips are round. A stroke
 * takes one cap for both of its ends, so one path cannot do both.
 */

import { pen } from './path.js'
import { radians } from './plane.js'

/**
 * One arrow, made from the sheet it belongs to.
 */
export class Arrow {
  /**
   * The look every arrow shares, used unless an arrow is given its own.
   *
   * @type {{width: number, headLength: number, headSpread: number}}
   */
  static proportions = { width: 24, headLength: 98, headSpread: 34.5 }

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
   * @param {number} spec.swing How far the loop reaches out past the edge
   * @param {number} spec.approach How straight the run into the head is
   * @param {number} [spec.width] Stroke width
   * @param {number} [spec.headLength] Length of each head arm
   * @param {number} [spec.headSpread] Angle between an arm and the shaft, in degrees
   */
  constructor(sheet, spec) {
    /** @type {import('./sheet.js').Sheet} Sheet the arrow comes out from */
    this.sheet = sheet
    Object.assign(this, Arrow.proportions, spec)
  }

  /**
   * Where the tail meets the sheet's edge.
   *
   * @returns {import('./plane.js').Point} The point
   */
  get tail() {
    return this.sheet.onEdge(this.edge, this.from)
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
   * @param {string} data Path data
   * @returns {{tag: string, attrs: Object}} Element
   */
  stroke(part, cap, data) {
    return {
      tag: 'path',
      attrs: {
        id: `${this.id}-${part}`,
        fill: 'none',
        stroke: this.colour,
        'stroke-width': this.width,
        'stroke-linecap': cap,
        'stroke-linejoin': 'round',
        d: data,
      },
    }
  }

  /**
   * The arrow as drawable elements.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The shaft and the head
   */
  elements() {
    const { tail, tip } = this
    const outward = this.sheet.edge(this.edge).outward
    const backwards = this.edge === 'left' ? this.sheet.across.mult(-1) : this.sheet.across
    const arm = (turn) => tip.add(backwards.rotate(radians(turn)).mult(this.headLength))

    const shaft = pen()
    const swing = tail.add(outward.mult(this.swing))
    const approach = tip.add(backwards.mult(this.approach))
    shaft.moveTo(tail.x, tail.y)
    shaft.bezierCurveTo(swing.x, swing.y, approach.x, approach.y, tip.x, tip.y)

    const head = pen()
    const start = arm(-this.headSpread)
    const end = arm(this.headSpread)
    head.moveTo(start.x, start.y)
    head.lineTo(tip.x, tip.y)
    head.lineTo(end.x, end.y)

    return [
      this.stroke('shaft', 'butt', shaft.toString()),
      this.stroke('head', 'round', head.toString()),
    ]
  }
}
