/**
 * Building path data.
 *
 * The commands come from d3-path, which rounds its coordinates as it writes
 * them. Every finished path then goes through compact, which writes the same
 * shape in fewer characters.
 */

import { pathRound } from 'd3-path'
import { DIGITS, round } from './emit.js'
import { centre } from './plane.js'
import { skia } from './skia.js'

/**
 * Start collecting path commands.
 *
 * @returns {object} A d3-path context that rounds its output
 */
export function pen() {
  return pathRound(DIGITS)
}

/**
 * A number in path data, however it is written.
 *
 * @type {RegExp}
 */
const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/**
 * One command of path data and everything that follows it up to the next one.
 *
 * @type {RegExp}
 */
const COMMAND = /([A-Z])([^A-Z]*)/g

/**
 * Path data, split into the commands it is made of.
 *
 * @param {string} data Path data, in absolute commands
 * @returns {Array<{letter: string, values: number[]}>} Each command and the
 *   numbers that follow it, in order
 */
function commands(data) {
  return [...data.matchAll(COMMAND)].map(([, letter, rest]) => ({
    letter,
    values: (rest.match(NUMBER) ?? []).map(Number),
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
    const written = round(value)
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
 * The same path with every coordinate trimmed to the decimals this build keeps.
 *
 * This is for path data that came from somewhere else; what pen writes is trimmed
 * already. It has to happen before compacting, because a relative step is exact
 * only where the two coordinates behind it are already rounded.
 *
 * Every number in what it is given has to be a coordinate, so an elliptical arc,
 * whose radii and flags are not, has to be gone by the time it arrives.
 *
 * @param {string} data Path data holding nothing but coordinates
 * @returns {string} The same path, rounded
 */
export function trimmed(data) {
  return data.replace(NUMBER, (value) => round(Number(value)))
}

/**
 * How many numbers each of the commands a contour is drawn with carries.
 *
 * @type {Object<string, number>}
 */
const SEGMENTS = { L: 2, Q: 4, C: 6 }

/**
 * Which way round one closed contour goes: 1 where it is clockwise, -1 where it
 * is anticlockwise, 0 where it covers nothing.
 *
 * The sum runs over the contour's own points as if straight lines joined them. A
 * curve's control points move that sum a little and its sign not at all.
 *
 * @param {number[]} points The numbers along the contour, in order
 * @returns {number} Which way it goes
 */
function handedness(points) {
  const loop = [...points, points[0], points[1]]
  let sum = 0
  for (let at = 0; at + 3 < loop.length; at += 2) {
    sum += loop[at] * loop[at + 3] - loop[at + 2] * loop[at + 1]
  }
  return Math.sign(sum)
}

/**
 * One closed contour drawn the other way round.
 *
 * It starts where it used to end and walks its segments backwards, each of them
 * turned about: a line ends where it began, a quadratic keeps its one control
 * point, and a cubic swaps its two.
 *
 * @param {string} piece One closed contour, in absolute commands
 * @returns {string} The same contour, the other way round
 * @throws {Error} If it is drawn with a command this cannot turn about
 */
function turned(piece) {
  const steps = commands(piece)
  const drawn = steps.slice(1).filter((step) => step.letter !== 'Z')
  for (const step of drawn) {
    if (SEGMENTS[step.letter] !== step.values.length) {
      throw new Error(`a contour is drawn ${step.letter}, which cannot be turned about`)
    }
  }

  const ends = [steps[0].values, ...drawn.map((step) => step.values.slice(-2))]
  const out = [`M${ends.at(-1).join(' ')}`]
  for (let at = drawn.length - 1; at >= 0; at--) {
    const { letter, values } = drawn[at]
    const control = letter === 'C' ? [...values.slice(2, 4), ...values.slice(0, 2)] : values.slice(0, -2)
    out.push(`${letter}${[...control, ...ends[at]].join(' ')}`)
  }
  return `${out.join('')}Z`
}

/**
 * The same shape written so that nonzero winding fills it.
 *
 * A boolean operation hands back contours only even odd reads correctly, and
 * Skia offers no way to turn them into winding ones. Nonzero reads the same
 * shape once every contour runs the opposite way round from the one holding it,
 * so how many contours hold each one is counted and the ones going the wrong way
 * for their depth are turned about.
 *
 * The contours a boolean operation leaves do not touch, so the point one starts
 * at is inside or outside every other, never on it.
 *
 * @param {string} data Path data in absolute commands
 * @returns {string} The same shape, wound so that nonzero fills it
 * @throws {Error} If a contour is drawn with a command that cannot be turned
 *   about
 */
function wound(data) {
  const pieces = data.split(/(?=M)/).filter((piece) => piece.trim() !== '')
  const paths = pieces.map((piece) => skia.Path.MakeFromSVGString(piece))

  return pieces
    .map((piece, at) => {
      const points = (piece.match(NUMBER) ?? []).map(Number)
      const held = paths.filter((other, which) => which !== at && other.contains(points[0], points[1])).length
      return handedness(points) === (held % 2 === 0 ? 1 : -1) ? piece : turned(piece)
    })
    .join('')
}

/**
 * A shape Skia worked out, as path data ready to be written.
 *
 * Everything Skia hands back arrives the same way: at full precision, and wound
 * for even odd where a boolean operation made it. This is the one way out, so no
 * shape reaches a file needing a fill rule to read right.
 *
 * @param {object} path The shape, as Skia has it
 * @returns {string} Path data, wound for nonzero, trimmed and shortened
 * @throws {Error} If a contour is drawn with a command that cannot be turned
 *   about
 */
export function shaped(path) {
  return compact(trimmed(wound(path.toSVGString())))
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
 * @param {{x: number, y: number}} middle Middle of the ellipse
 * @param {{x: number, y: number}} radii Half length along the axis and across it
 * @param {{x: number, y: number}} axis Direction the first radius points in
 * @returns {string} Path data for one closed subpath
 */
export function ellipse(middle, radii, axis) {
  const arm = axis.mult(radii.x)
  const from = middle.sub(arm)
  const to = middle.add(arm)
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
  const middle = centre(corners)

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
