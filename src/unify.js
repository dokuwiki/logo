/**
 * A drawing's elements merged into one path.
 *
 * A drawing of one colour that carries no stylesheet can be written as a single
 * path, which is what a Material icon file is. Its parts go on saying a centre
 * line and a stroke width, the way every part in this repository does, and this
 * turns each stroke into the shape that stroke covers.
 *
 * The outlines are laid one after another rather than unioned. Nonzero winding
 * then adds them where they overlap, so the file needs no fill rule. That holds
 * only while every closed shape goes the same way round, which is checked before
 * they are joined.
 */

import { compact, trimmed } from './path.js'
import { skia } from './skia.js'

/**
 * How a stroke can end, by the name SVG calls it and the name Skia does.
 *
 * @type {Object<string, string>}
 */
const CAPS = { butt: 'Butt', round: 'Round', square: 'Square' }

/**
 * How a stroke can turn a corner, by the name SVG calls it and the name Skia
 * does.
 *
 * @type {Object<string, string>}
 */
const JOINS = { miter: 'Miter', round: 'Round', bevel: 'Bevel' }

/**
 * The numbers along each of a path's contours, in order.
 *
 * @param {string} data Path data in absolute commands
 * @returns {number[][]} The numbers of each contour
 */
function contours(data) {
  return data
    .split('M')
    .filter((contour) => contour.trim() !== '')
    .map((contour) => (contour.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number))
}

/**
 * Which way round a path's outer contour goes: 1 where it is clockwise, -1 where
 * it is anticlockwise, 0 where it covers nothing.
 *
 * The sum runs over the contour's own numbers as if straight lines joined them.
 * A curve's control points move that sum a little and its sign not at all. The
 * widest contour is the outer one.
 *
 * @param {string} data Path data in absolute commands
 * @returns {number} Which way it goes
 */
function handedness(data) {
  const area = (points) => {
    const loop = [...points, points[0], points[1]]
    let sum = 0
    for (let at = 0; at + 3 < loop.length; at += 2) {
      sum += loop[at] * loop[at + 3] - loop[at + 2] * loop[at + 1]
    }
    return sum
  }

  const areas = contours(data).map(area)
  return Math.sign(areas.reduce((widest, one) => (Math.abs(one) > Math.abs(widest) ? one : widest), 0))
}

/**
 * The shape one element's stroke covers.
 *
 * @param {object} kit CanvasKit
 * @param {object} path The element's path, which this consumes
 * @param {Object} attrs What the element says about itself
 * @returns {string} Path data for the outline
 * @throws {Error} If the stroke says no width, ends or turns in a way SVG has no
 *   name for, or covers a shape Skia cannot work out
 */
function covered(kit, path, attrs) {
  const width = attrs['stroke-width']
  const cap = attrs['stroke-linecap'] ?? 'butt'
  const join = attrs['stroke-linejoin'] ?? 'miter'

  if (!width) throw new Error(`${attrs.id} is stroked but says no width, so there is no shape for it to cover`)
  if (!CAPS[cap]) throw new Error(`${attrs.id} ends its stroke ${cap}, which is no way a stroke ends`)
  if (!JOINS[join]) throw new Error(`${attrs.id} turns its corners ${join}, which is no way a stroke turns one`)

  const outline = path.makeStroked({ width, cap: kit.StrokeCap[CAPS[cap]], join: kit.StrokeJoin[JOINS[join]] })
  if (!outline) throw new Error(`${attrs.id} is stroked in a way Skia cannot work out the shape of`)
  return outline.toSVGString()
}

/**
 * The outlines one element comes to: what it fills, and the shape its stroke
 * covers, in the order they are painted.
 *
 * @param {object} kit CanvasKit
 * @param {{tag: string, attrs: Object}} element One element
 * @returns {Array<{id: string, colour: string, data: string}>} The outlines
 * @throws {Error} If it is not a path, or draws path data Skia cannot read
 */
function outlinesOf(kit, { tag, attrs }) {
  const id = attrs.id ?? 'an element with no id'
  if (tag !== 'path') throw new Error(`${id} is a ${tag}, and only a path can go into one path`)

  const path = kit.Path.MakeFromSVGString(attrs.d)
  if (!path) throw new Error(`${id} draws path data Skia cannot read`)

  const outlines = []
  const filled = attrs.fill && attrs.fill !== 'none'
  const stroked = attrs.stroke && attrs.stroke !== 'none'
  if (filled) outlines.push({ id, colour: attrs.fill, data: path.toSVGString() })
  if (stroked) outlines.push({ id, colour: attrs.stroke, data: covered(kit, path, attrs) })
  return outlines
}

/**
 * One variant's elements as a single path element.
 *
 * It carries no id, because there is one element and nothing selects it.
 *
 * @param {Array<{tag: string, attrs: Object}>} elements Elements of one variant,
 *   back to front
 * @returns {Array<{tag: string, attrs: Object}>} The one element
 * @throws {Error} If an element cannot go into one path, if two of them are
 *   painted different colours, or if the outlines disagree about which way round
 *   they go
 */
export function unify(elements) {
  const kit = skia
  const outlines = elements.flatMap((element) => outlinesOf(kit, element))

  const colours = new Set(outlines.map((outline) => outline.colour))
  if (colours.size !== 1) {
    throw new Error(`one path can hold one colour, and this drawing is painted ${[...colours].join(' and ')}`)
  }

  const hands = outlines.map((outline) => ({ ...outline, hand: handedness(outline.data) }))
  const astray = hands.filter((outline) => outline.hand !== hands[0].hand)
  if (astray.length) {
    throw new Error(
      `${astray.map((outline) => outline.id).join(', ')} ${astray.length > 1 ? 'go' : 'goes'} the other way round ` +
        `from ${hands[0].id}, so where two of them cross they would cancel instead of adding`,
    )
  }

  return [
    {
      tag: 'path',
      attrs: { fill: [...colours][0], d: compact(hands.map((outline) => trimmed(outline.data)).join('')) },
    },
  ]
}
