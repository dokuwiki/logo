/**
 * The drawing plane.
 *
 * Points and directions are the same object, a Point from
 * @mapbox/point-geometry. This module adapts it to angles written in degrees
 * and to a design written as plain data, and measures boxes on the plane.
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
