/**
 * The drawing plane.
 *
 * Points and directions are the same object, a Point from
 * @mapbox/point-geometry, adapted here to angles in degrees.
 */

import Point from '@mapbox/point-geometry'

export { Point }

/**
 * Turn degrees into radians.
 *
 * @param {number} degrees Angle
 * @returns {number} The same angle in radians
 */
export function radians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * Make a point out of plain data.
 *
 * @param {{x: number, y: number}} data Coordinates
 * @returns {Point} The point
 */
export function point(data) {
  return new Point(data.x, data.y)
}

/**
 * The unit direction an angle points in.
 *
 * @param {number} degrees Angle, measured clockwise from the positive x axis
 * @returns {Point} Unit direction
 */
export function direction(degrees) {
  return new Point(1, 0).rotate(radians(degrees))
}

/**
 * How far a point reaches along a direction.
 *
 * @param {Point} direction Unit direction
 * @param {Point} point The point
 * @returns {number} The distance along it
 */
export function dot(direction, point) {
  return direction.x * point.x + direction.y * point.y
}

/**
 * The middle of a set of points, which for the corners of a convex outline lies
 * inside it.
 *
 * @param {Array<Point>} corners The points
 * @returns {Point} Their average
 */
export function centre(corners) {
  return corners.reduce((total, corner) => total.add(corner), corners[0].mult(0)).mult(1 / corners.length)
}

/**
 * The half planes bounding a convex outline, each facing out of it. A point lies
 * inside where dot(facing, point) is at most reach for every one of them.
 *
 * @param {Array<Point>} corners The outline's corners, in either order
 * @returns {Array<{facing: Point, reach: number}>} The half planes
 */
export function bounding(corners) {
  const middle = centre(corners)
  return corners.map((corner, at) => {
    const next = corners[(at + 1) % corners.length]
    const out = next.sub(corner).perp().unit()
    const away = dot(out, middle.sub(corner)) > 0 ? out.mult(-1) : out
    return { facing: away, reach: dot(away, corner) }
  })
}

/**
 * Where a straight run passes through a convex outline, as the fractions of the
 * run at which it enters and leaves.
 *
 * The outline can be given room to spare, which stands every one of its edges off
 * by that distance and leaves its corners square, so a run meeting one of those
 * corners is held off by a little more than the room asks for.
 *
 * @param {Point} from Where the run starts
 * @param {Point} to Where it ends
 * @param {Array<Point>} corners The outline's corners
 * @param {number} [room] How much space to leave around it
 * @returns {{enters: number, leaves: number}|null} The fractions, or null where
 *   the run misses the outline altogether
 */
export function through(from, to, corners, room = 0) {
  const step = to.sub(from)
  let enters = 0
  let leaves = 1

  for (const edge of bounding(corners)) {
    const outside = dot(edge.facing, from) - edge.reach - room
    const rate = dot(edge.facing, step)
    if (Math.abs(rate) < 1e-9) {
      if (outside > 0) return null
      continue
    }
    const at = -outside / rate
    if (rate > 0) leaves = Math.min(leaves, at)
    else enters = Math.max(enters, at)
  }

  return enters < leaves ? { enters, leaves } : null
}

/**
 * The one box that holds all of the given ones.
 *
 * @param {Array<{x1: number, y1: number, x2: number, y2: number}>} boxes The boxes
 * @returns {{x1: number, y1: number, x2: number, y2: number}} Their extent
 */
export function extent(boxes) {
  return {
    x1: Math.min(...boxes.map((box) => box.x1)),
    y1: Math.min(...boxes.map((box) => box.y1)),
    x2: Math.max(...boxes.map((box) => box.x2)),
    y2: Math.max(...boxes.map((box) => box.y2)),
  }
}
