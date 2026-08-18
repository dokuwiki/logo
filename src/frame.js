/**
 * A local coordinate frame.
 *
 * Anything drawn along its own axis works in one of these: a sheet lying at a
 * tilt, a pencil lying at an angle. Parts of a component are placed in its
 * frame, so the component can be moved or turned as a whole.
 */

import { direction, point } from './plane.js'
import { round } from './emit.js'

/**
 * An origin, a direction and the right angle to it.
 */
export class Frame {
  /**
   * Set up a frame.
   *
   * @param {{x: number, y: number}} origin Where the frame starts
   * @param {number} angle Which way its first axis points, in degrees
   */
  constructor(origin, angle) {
    /** @type {import('./plane.js').Point} Where the frame starts */
    this.origin = point(origin)
    /** @type {number} Which way the first axis points, in degrees */
    this.angle = angle
    /** @type {import('./plane.js').Point} Unit direction along the frame */
    this.axis = direction(angle)
    /** @type {import('./plane.js').Point} Unit direction across the frame */
    this.side = this.axis.perp()
  }

  /**
   * A point in the frame.
   *
   * @param {number} along Distance from the origin along the axis
   * @param {number} across Distance from the axis, positive to its right
   * @returns {import('./plane.js').Point} The point on the canvas
   */
  at(along, across) {
    return this.origin.add(this.axis.mult(along)).add(this.side.mult(across))
  }

  /**
   * Transform that turns whatever is drawn in this frame into place.
   *
   * @returns {string} Value for a transform attribute
   */
  transform() {
    return `rotate(${round(this.angle)} ${round(this.origin.x)} ${round(this.origin.y)})`
  }
}
