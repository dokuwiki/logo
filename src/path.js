/**
 * Building path data.
 *
 * The commands come from d3-path, which rounds its coordinates as it writes
 * them. Every finished path then goes through compact, which writes the same
 * shape in fewer characters.
 */

import { pathRound } from 'd3-path'
import { round } from './emit.js'

/**
 * How many decimals to keep in path data.
 *
 * @type {number}
 */
const DIGITS = 2

/**
 * Start collecting path commands.
 *
 * @returns {object} A d3-path context that rounds its output
 */
export function pen() {
  return pathRound(DIGITS)
}

/**
 * Path data, split into the commands it is made of.
 *
 * @param {string} data Path data, in absolute commands
 * @returns {Array<{letter: string, values: number[]}>} Each command and the
 *   numbers that follow it, in order
 */
function commands(data) {
  return [...data.matchAll(/([A-Z])([^A-Z]*)/g)].map(([, letter, rest]) => ({
    letter,
    values: (rest.match(/-?\d*\.?\d+/g) ?? []).map(Number),
  }))
}

/**
 * Numbers written with the fewest separators the grammar allows: a comma
 * between two of them, and nothing at all before a minus sign, which parts
 * them by itself.
 *
 * @param {number[]} values The numbers
 * @returns {string} The numbers, run together
 */
function numbers(values) {
  return values.reduce((out, value) => {
    const written = String(Number(value.toFixed(DIGITS)))
    return out === '' || written.startsWith('-') ? out + written : `${out},${written}`
  }, '')
}

/**
 * What numbers standing on their own are read as, where the command letter
 * before them is left out: that same command again, except after a move, where
 * they draw lines.
 *
 * @param {string} letter The command before them
 * @returns {string} The command they are read as
 */
function implied(letter) {
  if (letter === 'M') return 'L'
  if (letter === 'm') return 'l'
  return letter
}

/**
 * The same path, written shorter.
 *
 * Three things shorten it and none of them moves a point. A line to where the
 * pen already rests draws nothing, so it goes. A command is written from where
 * the pen is rather than from the corner of the canvas wherever that is
 * shorter, which it usually is, because a step is a smaller number than a
 * place. And a command letter is left out where the command before it already
 * says what to do and the numbers open with a minus sign to part them.
 *
 * A step is the difference of two coordinates already trimmed to DIGITS
 * decimals, so it is exact at DIGITS decimals as well and no point drifts.
 *
 * An elliptical arc stays absolute. Only the last two of its seven numbers are
 * a point; the rest are two radii, a turn and two flags, so there is little to
 * win and more to get wrong.
 *
 * @param {string} data Path data, in absolute commands
 * @returns {string} Path data drawing the same shape
 */
export function compact(data) {
  let out = ''
  let last = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0

  for (const { letter, values } of commands(data)) {
    if (letter === 'Z') {
      out += 'Z'
      x = startX
      y = startY
      last = ''
      continue
    }
    if (letter === 'L' && values[0] === x && values[1] === y) continue

    const absolute = letter + numbers(values)
    let written = absolute
    if (letter !== 'A' && out !== '') {
      const step = values.map((value, at) => (at % 2 === 0 ? value - x : value - y))
      const relative = letter.toLowerCase() + numbers(step)
      if (relative.length < absolute.length) written = relative
    }

    const bare = written.slice(1)
    out += implied(last) === written[0] && bare.startsWith('-') ? bare : written

    last = written[0]
    if (letter === 'M') {
      startX = values[0]
      startY = values[1]
    }
    x = values.at(-2)
    y = values.at(-1)
  }

  return out
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
  return compact(path.toString())
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
  return compact(
    `M${round(from.x)} ${round(from.y)} ${sweep} ${round(to.x)} ${round(to.y)} ` +
      `${sweep} ${round(from.x)} ${round(from.y)}Z`,
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
