/**
 * A local coordinate frame.
 *
 * Anything drawn along its own axis works in one of these. Parts of a component
 * are placed in its frame, so the component moves and turns as a whole.
 */

import { direction, point } from './plane.js'
import { matrix } from './emit.js'

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
   * The frame written as a transform, so that whatever is drawn in the frame's
   * own measure lands in place.
   *
   *
   * @param {number} [scale] How much larger than its own measure to draw it
   * @param {number} [along] How far along the axis to start instead
   * @param {number} [across] How far across the axis to start instead
   * @returns {string} Value for a transform attribute
   */
  matrix(scale = 1, along = 0, across = 0) {
    const start = this.at(along, across)
    return matrix(
      this.axis.x * scale,
      this.axis.y * scale,
      this.side.x * scale,
      this.side.y * scale,
      start.x,
      start.y,
    )
  }
}
