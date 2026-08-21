/**
 * A flat pencil, shaped the way Material's own edit_document shapes one.
 *
 * A straight bar with a semicircular blunt end and a point cut symmetrically
 * across the other end. What the design gives is the silhouette itself rather
 * than a centre line to be stroked, so the width it asks for is the width the
 * pencil is. The frame is worked into the path data rather than left as a
 * transform, so the merge at the end of the build has nothing to unpick.
 *
 * How thick the wall looks is the hole in that silhouette, and which hole it
 * carries is the whole of the difference between the two paintings.
 *
 * Lengths run along the pencil from its point, widths across it.
 */

import { Frame } from '../frame.js'
import { compact, pen } from '../path.js'

/**
 * How a pencil can be painted, which picks which hole the silhouette carries.
 *
 * @type {string[]}
 */
const PAINTINGS = ['outline', 'solid']

/**
 * Which way a point lies from a centre, as an angle an arc can be drawn between.
 *
 * @param {import('../plane.js').Point} centre Middle of the arc
 * @param {import('../plane.js').Point} point A point on it
 * @returns {number} The angle in radians
 */
function angleFrom(centre, point) {
  return Math.atan2(point.y - centre.y, point.x - centre.x)
}

/**
 * A closed outline through the given corners, every corner square.
 *
 * @param {Array<import('../plane.js').Point>} corners Corners in drawing order
 * @returns {string} Path data for one closed subpath
 */
function closed(corners) {
  const path = pen()
  path.moveTo(corners[0].x, corners[0].y)
  for (const corner of corners.slice(1)) path.lineTo(corner.x, corner.y)
  path.closePath()
  return compact(path.toString())
}

/**
 * One pencil.
 */
export class Pencil {
  /**
   * What a pencil looks like, used unless a pencil is given its own.
   *
   * The width, the wall and the ferrule are Material's own, measured off
   * edit_document on its 24 grid.
   *
   * @type {Object<string, number>}
   */
  static proportions = {
    length: 14,
    width: 4.35,
    wall: 1.5,
    ferrule: 5,
  }

  /**
   * Lay a pencil down.
   *
   * @param {object} spec Where this pencil lies
   * @param {string} spec.id Element id, used as a prefix for its own parts
   * @param {{x: number, y: number}} spec.at The point
   * @param {number} spec.turn Which way it points, in degrees
   * @param {string} spec.fill What it is filled with
   * @param {string} [spec.paint] Whether the hole is the wall or the ferrule mark
   * @param {number} [spec.size] How much larger than a standard icon pencil this
   *   one is drawn
   * @param {number} [spec.length] Point to blunt end
   * @param {number} [spec.width] Across the barrel
   * @param {number} [spec.wall] How thick the wall looks
   * @param {number} [spec.ferrule] The solid block at the blunt end
   * @throws {Error} If it is painted in no way a pencil can be painted, if the
   *   wall leaves no hole, or if the ferrule reaches back past the point
   */
  constructor({ id, at, turn, fill, paint = PAINTINGS[0], size = 1, ...proportions }) {
    if (!PAINTINGS.includes(paint)) {
      throw new Error(`${id} is painted ${paint}, and a pencil is ${PAINTINGS.join(' or ')}`)
    }
    Object.assign(this, Pencil.proportions, proportions, { id, fill, paint, size })

    if (2 * this.wall >= this.width) {
      throw new Error(`${id} has a wall of ${this.wall} on a barrel ${this.width} across, which leaves no hole`)
    }
    if (this.length - this.ferrule <= this.wall * Math.SQRT2 + this.half - this.wall) {
      throw new Error(
        `${id} has a ferrule of ${this.ferrule} on a pencil ${this.length} long, ` +
          'so the hole in it would reach back past the point',
      )
    }

    /** @type {Frame} The pencil's own frame, running along it then across */
    this.frame = new Frame(at, turn)
  }

  /**
   * Whether the hole is the ferrule mark rather than the wall.
   *
   * @returns {boolean} Whether it is solid
   */
  get solid() {
    return this.paint === 'solid'
  }

  /**
   * Half the barrel's width, which is how far the silhouette stands from the
   * axis and how large a radius the blunt end is turned on.
   *
   * @returns {number} The distance
   */
  get half() {
    return this.width / 2
  }

  /**
   * The pencil as a convex outline, for anything that has to keep clear of it.
   *
   * It is the bar the pencil is drawn in rather than the drawn shape itself. The
   * cuts that sharpen the point and the round of the blunt end both fall inside
   * that bar, so whatever is held off the bar is held off the pencil.
   *
   * @returns {Array<import('../plane.js').Point>} Its corners, clockwise
   */
  get bounds() {
    const half = this.half
    return [this.at(0, -half), this.at(this.length, -half), this.at(this.length, half), this.at(0, half)]
  }

  /**
   * A point on the pencil, in the pencil's own measure.
   *
   * @param {number} along Distance from the point
   * @param {number} across Distance from the axis, positive to its right
   * @returns {import('../plane.js').Point} The point on the canvas
   */
  at(along, across) {
    return this.frame.at(along * this.size, across * this.size)
  }

  /**
   * The silhouette given room to spare: the same shape offset outward by that
   * much, which turns every corner of it into an arc of that radius.
   *
   * This is what anything keeping clear of the pencil follows, so what it leaves
   * around the pencil is an even margin rather than a wedge cut past it.
   *
   * It is listed the other way round from the pencil itself, because it is a
   * shape to be taken out of something rather than one to be drawn.
   *
   * @param {number} room How much space to leave
   * @returns {string} Path data for one closed subpath, anticlockwise
   */
  grown(room) {
    const half = this.half * this.size
    const length = this.length * this.size
    const corner = room / Math.SQRT2
    const path = pen()

    const start = this.frame.at(-corner, -corner)
    const tip = this.frame.at(0, 0)
    const shoulder = (across) => this.frame.at(half, across * half)
    const cap = this.frame.at(length - half, 0)
    const turn = (centre, radius, from, to) =>
      path.arc(centre.x, centre.y, radius, angleFrom(centre, from), angleFrom(centre, to), true)

    path.moveTo(start.x, start.y)
    turn(tip, room, start, this.frame.at(-corner, corner))
    turn(shoulder(1), room, this.frame.at(half - corner, half + corner), this.frame.at(half, half + room))
    turn(cap, half + room, this.frame.at(length - half, half + room), this.frame.at(length - half, -half - room))
    turn(shoulder(-1), room, this.frame.at(half, -half - room), this.frame.at(half - corner, -half - corner))
    path.closePath()
    return compact(path.toString())
  }

  /**
   * The barrel's silhouette: the point, the two cuts opening out to the full
   * width, the long run, and the semicircular blunt end.
   *
   * The cuts meet the axis at 45 degrees, which is what makes the point
   * symmetric, so they reach back from the shoulder by exactly one half width.
   *
   * @returns {string} Path data for one closed subpath, clockwise
   */
  silhouette() {
    const half = this.half
    const blunt = this.length - half
    const centre = this.at(blunt, 0)
    const from = this.at(blunt, -half)
    const to = this.at(blunt, half)
    const path = pen()

    const tip = this.at(0, 0)
    const shoulder = this.at(half, -half)
    path.moveTo(tip.x, tip.y)
    path.lineTo(shoulder.x, shoulder.y)
    path.lineTo(from.x, from.y)
    path.arc(centre.x, centre.y, half * this.size, angleFrom(centre, from), angleFrom(centre, to))
    const back = this.at(half, half)
    path.lineTo(back.x, back.y)
    path.closePath()
    return compact(path.toString())
  }

  /**
   * The wall as a hole: the silhouette pulled in by the wall all round, cut off
   * flat where the ferrule begins.
   *
   * Pulling in two cuts that meet the axis at 45 degrees moves their meeting
   * point back along the axis by the wall's own diagonal.
   *
   * @returns {string} Path data for one closed subpath, anticlockwise
   */
  slot() {
    const inner = this.half - this.wall
    const point = this.wall * Math.SQRT2
    const far = this.length - this.ferrule
    return closed([
      this.at(point, 0),
      this.at(point + inner, inner),
      this.at(far, inner),
      this.at(far, -inner),
      this.at(point + inner, -inner),
    ])
  }

  /**
   * The ferrule mark as a hole: a square as wide as the wall's own hole, set
   * square to the axis and centred in the ferrule.
   *
   * @returns {string} Path data for one closed subpath, anticlockwise
   */
  mark() {
    const reach = this.half - this.wall
    const middle = this.length - this.ferrule / 2
    return closed([
      this.at(middle - reach, -reach),
      this.at(middle - reach, reach),
      this.at(middle + reach, reach),
      this.at(middle + reach, -reach),
    ])
  }

  /**
   * The pencil as drawable elements: the silhouette with one hole in it.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One path
   */
  elements() {
    const hole = this.solid ? this.mark() : this.slot()
    return [{ tag: 'path', attrs: { id: `${this.id}-barrel`, fill: this.fill, d: `${this.silhouette()} ${hole}` } }]
  }
}
