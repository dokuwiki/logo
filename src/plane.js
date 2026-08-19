/**
 * The drawing plane.
 *
 * Points and directions are the same object, a Point from
 * @mapbox/point-geometry. This module adapts it to angles written in degrees
 * and to a design written as plain data.
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
