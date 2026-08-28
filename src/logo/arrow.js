/**
 * An arrow looping around a sheet.
 *
 * Shaft and head are two paths because they end differently: the tail is cut
 * flat against the sheet's edge, the head's tips are round, and a stroke takes
 * one cap for both of its ends.
 */

import { compact, outline, pen } from '../path.js'
import { drawn } from '../parts.js'
import { radians } from '../plane.js'

/**
 * One arrow, made from the sheet it belongs to.
 */
export class Arrow {
  /**
   * The look every arrow shares, used unless an arrow is given its own.
   *
   * @type {{headLength: number, headSpread: number, headBevel: number}}
   */
  static proportions = { headLength: 98, headSpread: 34.5, headBevel: 70 }

  /**
   * What a design can tell an arrow, besides where it is placed and whether it
   * is drawn, which every part is told the same way.
   *
   * @type {string[]}
   */
  static takes = [
    'id',
    'from',
    'to',
    'swing',
    'approach',
    'stroke',
    'keyline',
    'draws',
    'solid',
    ...Object.keys(Arrow.proportions),
  ]

  /**
   * Attach an arrow to a sheet.
   *
   * @param {import('../rectangle.js').Rectangle} sheet Sheet the arrow comes out from
   * @param {object} spec What this arrow does
   * @param {string} spec.id Element id
   * @param {{edge: 'left'|'right', along: number}} spec.from Which edge the tail
   *   comes out of, and how far down it the tail sits, from 0 to 1
   * @param {{x: number, y: number}} spec.to Where the head lands on the sheet, in
   *   the sheet's own measure
   * @param {number} spec.swing How far the loop reaches out past the edge,
   *   measured from the edge itself
   * @param {number} spec.approach How straight the run into the head is
   * @param {{colour: string, width: number}} spec.stroke What the arrow is drawn
   *   in and how heavy it is
   * @param {{colour: string, room: number}} [spec.keyline] What the arrow is
   *   drawn in where it keeps room from whatever lies behind it, and how much
   *   room that is
   * @param {number} [spec.headLength] Length of each head arm
   * @param {number} [spec.headSpread] Angle between an arm and the shaft, in degrees
   * @param {number} [spec.headBevel] How far back from a solid head's corners
   *   the rounding starts
   * @param {string[]} [spec.draws] Which parts to draw, the shaft and the head
   *   by default
   * @param {boolean} [spec.solid] Whether the head is a filled triangle rather
   *   than two strokes
   */
  constructor(sheet, spec) {
    /** @type {import('../rectangle.js').Rectangle} Sheet the arrow comes out from */
    this.sheet = sheet
    Object.assign(this, Arrow.proportions, spec)
  }

  /**
   * Where the tail meets the sheet's edge.
   *
   * It is held off the edge by half the sheet's outline, so the flat cut lands
   * against the outside of that line and the arrow reads as coming out from
   * behind the paper.
   *
   * @returns {import('../plane.js').Point} The point
   */
  get tail() {
    const edge = this.sheet.edge(this.from.edge)
    const clear = (this.sheet.stroke?.width ?? 0) / 2
    return this.sheet.onEdge(this.from).add(edge.outward.mult(clear))
  }

  /**
   * Where the head points.
   *
   * @returns {import('../plane.js').Point} The point
   */
  get tip() {
    return this.sheet.frame.at(this.to.x, this.to.y)
  }

  /**
   * One part of the arrow as a path, painted the way every part is.
   *
   * @param {string} part What to call this part
   * @param {string} cap How its stroke ends
   * @param {string} fill What fills it, if anything
   * @param {number} width How wide its stroke is
   * @param {string} data Path data
   * @returns {{tag: string, attrs: Object}} Element
   */
  painted(part, cap, fill, width, data) {
    return {
      tag: 'path',
      attrs: {
        id: `${this.id}-${part}`,
        fill,
        stroke: this.stroke.colour,
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
   * @returns {import('../plane.js').Point} Direction
   */
  get backwards() {
    return this.from.edge === 'left' ? this.sheet.across.mult(-1) : this.sheet.across
  }

  /**
   * The shaft: out from behind the sheet's edge, round and back across it.
   *
   * @returns {{tag: string, attrs: Object}} Element
   */
  shaftElement() {
    const { tail, tip, backwards } = this
    const outward = this.sheet.edge(this.from.edge).outward
    const swing = this.sheet.onEdge(this.from).add(outward.mult(this.swing))
    const approach = tip.add(backwards.mult(this.approach))

    const path = pen()
    path.moveTo(tail.x, tail.y)
    path.bezierCurveTo(swing.x, swing.y, approach.x, approach.y, tip.x, tip.y)
    return this.painted('shaft', 'butt', 'none', this.stroke.width, compact(path.toString()))
  }

  /**
   * The head: two arms meeting at the tip, or the triangle between them where
   * the head must stand for the whole arrow.
   *
   * A solid head carries no stroke, so its corners are cut back and bridged in
   * the path itself: a stroke that rounded them would cap the arms as well and
   * leave a nub on each corner.
   *
   * @returns {{tag: string, attrs: Object}} Element
   */
  headElement() {
    const { tip, backwards } = this
    const arm = (turn) => tip.add(backwards.rotate(radians(turn)).mult(this.headLength))
    const start = arm(-this.headSpread)
    const end = arm(this.headSpread)

    if (this.solid) {
      return this.painted('head', 'round', this.stroke.colour, 0, outline([start, tip, end], this.headBevel))
    }

    const path = pen()
    path.moveTo(start.x, start.y)
    path.lineTo(tip.x, tip.y)
    path.lineTo(end.x, end.y)
    return this.painted('head', 'round', 'none', this.stroke.width, compact(path.toString()))
  }

  /**
   * The room the arrow keeps from whatever lies behind it: the arrow drawn
   * again, wider by that room on either side, in the keyline's own colour.
   *
   * It is the shaft and the head together rather than a keyline apiece, because
   * the shaft runs to the tip and the head's arms meet there. Drawn between the
   * two, the head's room would cut a notch out of the shaft.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The two pieces
   */
  room() {
    const wider = (part, element) => ({
      ...element,
      attrs: {
        ...element.attrs,
        id: `${this.id}-keyline-${part}`,
        ...(element.attrs.fill === 'none' ? {} : { fill: this.keyline.colour }),
        stroke: this.keyline.colour,
        'stroke-width': element.attrs['stroke-width'] + 2 * this.keyline.room,
      },
    })
    return [wider('shaft', this.shaftElement()), wider('head', this.headElement())]
  }

  /**
   * The arrow as drawable elements.
   *
   * The keyline comes first, under both of the arrow's own pieces. An arrow
   * given none draws no piece of that name.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The parts this arrow draws
   * @throws {Error} If a part being drawn is not one of an arrow's own
   */
  elements() {
    const parts = {
      ...(this.keyline ? { keyline: () => this.room() } : {}),
      shaft: () => this.shaftElement(),
      head: () => this.headElement(),
    }
    return drawn(Object.keys(parts), this.draws, 'an arrow').flatMap((name) => parts[name]())
  }
}
