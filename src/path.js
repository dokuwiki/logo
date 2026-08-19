/**
 * Building path data.
 *
 * The commands come from d3-path, which rounds its coordinates as it writes
 * them.
 */

import { pathRound } from 'd3-path'
import { round } from './emit.js'

/**
 * How many decimals to keep in path data.
 *
 * @type {number}
 */
const DIGITS = 3

/**
 * Start collecting path commands.
 *
 * @returns {object} A d3-path context that rounds its output
 */
export function pen() {
  return pathRound(DIGITS)
}

/**
 * Draw a closed outline through the given corners, softening each one.
 *
 * A corner is cut off the same distance along both its sides and bridged with
 * a quadratic curve through the corner itself. Fixing that distance keeps a
 * sharp corner sharp. A corner whose sides are too short is cut by as much as
 * they allow.
 *
 * @param {Array<{x: number, y: number}>} corners Corners in drawing order
 * @param {number} bevel How far back from each corner the curve starts
 * @returns {string} Path data for one closed subpath
 */
export function outline(corners, bevel) {
  const path = pen()
  const count = corners.length
  const back = (from, towards) => {
    const side = towards.sub(from)
    const length = side.mag()
    return length === 0 ? from : from.add(side.mult(Math.min(bevel, length / 2) / length))
  }

  for (let i = 0; i < count; i++) {
    const corner = corners[i]
    const entry = back(corner, corners[(i + count - 1) % count])
    const exit = back(corner, corners[(i + 1) % count])
    if (i === 0) path.moveTo(entry.x, entry.y)
    else path.lineTo(entry.x, entry.y)
    path.quadraticCurveTo(corner.x, corner.y, exit.x, exit.y)
  }
  path.closePath()
  return path.toString()
}

/**
 * Draw a closed ellipse turned to face a given direction.
 *
 * Written out by hand, because d3-path draws circles alone.
 *
 * @param {{x: number, y: number}} centre Middle of the ellipse
 * @param {{x: number, y: number}} radii Half length along the axis and across it
 * @param {{x: number, y: number}} axis Direction the first radius points in
 * @returns {string} Path data for one closed subpath
 */
export function ellipse(centre, radii, axis) {
  const arm = axis.mult(radii.x)
  const from = centre.sub(arm)
  const to = centre.add(arm)
  const turn = (Math.atan2(axis.y, axis.x) * 180) / Math.PI
  const sweep = `A${round(radii.x)} ${round(radii.y)} ${round(turn)} 0 1`
  return (
    `M${round(from.x)} ${round(from.y)} ${sweep} ${round(to.x)} ${round(to.y)} ` +
    `${sweep} ${round(from.x)} ${round(from.y)}Z`
  )
}

/**
 * Pull a convex outline inward by an even distance.
 *
 * Each new edge stays parallel to the one it came from.
 *
 * @param {Array<import('./plane.js').Point>} corners Corners in drawing order
 * @param {number} distance How far in to move
 * @returns {Array<import('./plane.js').Point>} The pulled-in corners
 */
export function inset(corners, distance) {
  const count = corners.length
  const middle = corners
    .reduce((total, corner) => total.add(corner), corners[0].mult(0))
    .mult(1 / count)

  const edges = corners.map((from, i) => {
    const to = corners[(i + 1) % count]
    const run = to.sub(from)
    let inward = run.perp().unit()
    if (from.add(inward).dist(middle) > from.dist(middle)) inward = inward.mult(-1)
    return { from: from.add(inward.mult(distance)), run }
  })

  const cross = (a, b) => a.x * b.y - a.y * b.x
  return edges.map((edge, i) => {
    const before = edges[(i + count - 1) % count]
    const turn = cross(before.run, edge.run)
    if (Math.abs(turn) < 1e-9) return edge.from
    const t = cross(edge.from.sub(before.from), edge.run) / turn
    return before.from.add(before.run.mult(t))
  })
}
