/**
 * A flat pencil.
 *
 * The design gives the silhouette itself rather than a centre line to be stroked,
 * so the width it asks for is the width the pencil is. The frame is worked into
 * the path data rather than left as a transform, so what it draws carries no
 * attribute but its own shape.
 *
 * The hole in that silhouette is the whole of the difference between the two
 * paintings, and both say where the sharpened point ends with a line across.
 *
 * Lengths run along the pencil from its point, widths across it.
 */

import { Frame } from '../frame.js'
import { OUTLINE, painting, SOLID } from './paint.js'
import { compact, grown as pushedOut, pen, shaped } from '../path.js'
import { skia } from '../skia.js'

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
   * The width and the wall are Material's own, measured off edit_document on its
   * 24 grid. The blunt end's radius is the logo pencil's, as the same fraction of
   * the width.
   *
   * The length is what keeps the blunt end inside the canvas. Cut flat, that end
   * reaches into the canvas corner by its corner rather than by its middle.
   *
   * @type {Object<string, number>}
   */
  static proportions = {
    length: 13,
    width: 4.35,
    end: 0.85,
    wall: 1.5,
    parting: 0.75,
  }

  /**
   * What a design can tell a pencil, besides where it is placed and whether it
   * is drawn, which every part is told the same way.
   *
   * @type {string[]}
   */
  static takes = ['id', 'at', 'turn', 'fill', 'paint', ...Object.keys(Pencil.proportions)]

  /**
   * Lay a pencil down.
   *
   * @param {object} spec Where this pencil lies
   * @param {string} spec.id Element id, used as a prefix for its own parts
   * @param {{x: number, y: number}} spec.at The point
   * @param {number} spec.turn Which way it points, in degrees
   * @param {string} spec.fill What it is filled with
   * @param {string} [spec.paint] Whether the hole is the hollow or the gap
   * @param {number} [spec.length] Point to blunt end
   * @param {number} [spec.width] Across the barrel
   * @param {number} [spec.end] Radius the two corners of the blunt end are turned
   *   on
   * @param {number} [spec.wall] How thick the wall looks
   * @param {number} [spec.parting] How thick the line across the pencil is
   * @throws {Error} If it is painted in no way a pencil can be painted, if the
   *   wall leaves no hollow, or if the hollow would be closed before it opens
   */
  constructor({ id, at, turn, fill, paint = OUTLINE, ...proportions }) {
    Object.assign(this, Pencil.proportions, proportions, { id, fill, paint: painting(paint, id, 'pencil') })

    if (this.inner <= 0) {
      throw new Error(`${id} has a wall of ${this.wall} on a barrel ${this.width} across, which leaves no hollow`)
    }
    if (this.length - this.wall <= this.hollow) {
      throw new Error(
        `${id} has a wall of ${this.wall} on a pencil ${this.length} long, ` +
          'so the hollow in it would be closed before it opens',
      )
    }

    /** @type {Frame} The pencil's own frame, running along it then across */
    this.frame = new Frame(at, turn)
  }

  /**
   * Whether the hole is the gap rather than the hollow.
   *
   * @returns {boolean} Whether it is solid
   */
  get solid() {
    return this.paint === SOLID
  }

  /**
   * Half the barrel's width, which is how far the silhouette stands from the axis
   * and how far back from the shoulder the point's cuts reach.
   *
   * The cuts stand out and reach back by that same distance, so they meet the
   * axis at 45 degrees.
   *
   * @returns {number} The distance
   */
  get half() {
    return this.width / 2
  }

  /**
   * How far the hollow stands from the axis: the barrel's half width, less the
   * wall on that side.
   *
   * @returns {number} The distance
   */
  get inner() {
    return this.half - this.wall
  }

  /**
   * How far along the pencil the cuts pulled in by the wall meet the axis.
   *
   * Pulling in two cuts that meet the axis at 45 degrees moves their meeting
   * point back along the axis by the wall's own diagonal.
   *
   * @returns {number} The distance
   */
  get hollow() {
    return this.wall * Math.SQRT2
  }

  /**
   * The pencil as a convex outline, for anything that has to keep clear of it.
   *
   * It is the bar the pencil is drawn in rather than the drawn shape itself. The
   * cuts that sharpen the point and the rounds on the blunt end both fall inside
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
    return this.frame.at(along, across)
  }

  /**
   * The silhouette given room to spare: the same shape offset outward by that
   * much, which turns every corner of it into an arc of that radius.
   *
   * This is what anything keeping clear of the pencil follows, so what it leaves
   * around the pencil is an even margin rather than a wedge cut past it.
   *
   * @param {number} room How much space to leave
   * @returns {string} Path data
   * @throws {Error} If Skia cannot work the shape out
   */
  grown(room) {
    return pushedOut(this.silhouette(), room)
  }

  /**
   * The barrel's silhouette: the point, the two cuts opening out to the full
   * width, the long run, and the blunt end cut flat across with both of its
   * corners turned on a radius.
   *
   * @returns {string} Path data for one closed subpath
   */
  silhouette() {
    const half = this.half
    const path = pen()
    const tip = this.at(0, 0)
    const near = this.at(half, -half)
    const back = this.at(half, half)
    const one = this.at(this.length, -half)
    const two = this.at(this.length, half)

    path.moveTo(tip.x, tip.y)
    path.lineTo(near.x, near.y)
    path.arcTo(one.x, one.y, two.x, two.y, this.end)
    path.arcTo(two.x, two.y, back.x, back.y, this.end)
    path.lineTo(back.x, back.y)
    path.closePath()
    return compact(path.toString())
  }

  /**
   * The hollow as a hole: the silhouette pulled in by the wall all round, cut off
   * flat where it first stands its full width from the axis.
   *
   * Cut there, it leaves the sharpened end of the pencil solid, parted from the
   * hollow by one line across.
   *
   * @returns {string} Path data for one closed subpath
   */
  slot() {
    const inner = this.inner
    const near = this.hollow + inner
    const far = this.length - this.wall
    return closed([
      this.at(near, inner),
      this.at(far, inner),
      this.at(far, -inner),
      this.at(near, -inner),
    ])
  }

  /**
   * The parting as a hole: a gap across the full width of the pencil, where the
   * sharpened end meets the barrel.
   *
   * It begins at the shoulder and runs toward the blunt end, so it parts off the
   * point itself. It reaches past the barrel on both sides, so it carries edge to
   * edge however the barrel is shaped there.
   *
   * @returns {string} Path data for one closed subpath
   */
  gap() {
    const reach = this.width
    const from = this.half
    const to = from + this.parting
    return closed([this.at(from, -reach), this.at(from, reach), this.at(to, reach), this.at(to, -reach)])
  }

  /**
   * The pencil as drawable elements: the silhouette with its hole taken out.
   *
   * Skia takes the hole out here rather than the hole being laid over the
   * silhouette wound the other way. The parting's edges lie along the barrel's
   * own, and a boolean operation later can close up a hole that only winds
   * against a shape it touches.
   *
   * @returns {Array<{tag: string, attrs: Object}>} One path
   * @throws {Error} If Skia cannot take the hole out
   */
  elements() {
    const hole = this.solid ? this.gap() : this.slot()
    const shape = skia.Path.MakeFromOp(
      skia.Path.MakeFromSVGString(this.silhouette()),
      skia.Path.MakeFromSVGString(hole),
      skia.PathOp.Difference,
    )
    if (!shape) throw new Error(`the hole in ${this.id} is a shape Skia cannot take out of it`)
    return [{ tag: 'path', attrs: { id: `${this.id}-barrel`, fill: this.fill, d: shaped(shape) } }]
  }
}
