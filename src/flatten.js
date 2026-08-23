/**
 * A drawing's elements cut into one path.
 *
 * A drawing of one colour that carries no stylesheet can be written as a single
 * path, as a Material icon file is. Its parts still give a centre line and a
 * stroke width, so each stroke is turned into the shape it covers.
 */

import { shaped } from './path.js'
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
 * The shape one element's stroke covers.
 *
 * @param {object} path The element's path
 * @param {Object} attrs What the element says about itself
 * @returns {object} The outline
 * @throws {Error} If the stroke says no width, ends or turns in a way SVG has no
 *   name for, or covers a shape Skia cannot work out
 */
function covered(path, attrs) {
  const width = attrs['stroke-width']
  const cap = attrs['stroke-linecap'] ?? 'butt'
  const join = attrs['stroke-linejoin'] ?? 'miter'

  if (!width) throw new Error(`${attrs.id} is stroked but says no width, so there is no shape for it to cover`)
  if (!CAPS[cap]) throw new Error(`${attrs.id} ends its stroke ${cap}, which is no way a stroke ends`)
  if (!JOINS[join]) throw new Error(`${attrs.id} turns its corners ${join}, which is no way a stroke turns one`)

  const outline = path.makeStroked({ width, cap: skia.StrokeCap[CAPS[cap]], join: skia.StrokeJoin[JOINS[join]] })
  if (!outline) throw new Error(`${attrs.id} is stroked in a way Skia cannot work out the shape of`)
  return outline
}

/**
 * How an element says where it is placed, which is the one form this build
 * writes.
 *
 * @type {RegExp}
 */
const MATRIX = /^matrix\(([^)]*)\)$/

/**
 * How far out of square a transform may be before it is called uneven.
 *
 * The four numbers that turn and scale are written to five decimals, so a
 * transform that is square arrives a shade out of it.
 *
 * @type {number}
 */
const SQUARE = 1e-4

/**
 * The shape one element draws, in its own measure.
 *
 * @param {{tag: string, attrs: Object}} element One element
 * @param {string} id Which element, for the message
 * @returns {object} Its path
 * @throws {Error} If it is of a kind that draws no shape, or draws path data
 *   Skia cannot read
 */
function shapeOf({ tag, attrs }, id) {
  if (tag === 'rect') {
    const builder = new skia.PathBuilder()
    builder.addRRect(skia.RRectXY(skia.LTRBRect(0, 0, attrs.width, attrs.height), attrs.rx, attrs.rx))
    return builder.snapshot()
  }
  if (tag !== 'path') throw new Error(`${id} is a ${tag}, which is no shape to cut with`)

  const path = skia.Path.MakeFromSVGString(attrs.d)
  if (!path) throw new Error(`${id} draws path data Skia cannot read`)
  return path
}

/**
 * One shape moved to where its element says it is placed.
 *
 * A stroke is turned into the shape it covers before this, in the element's own
 * measure, so a width said there is that width there. That holds only for a
 * transform that turns and scales evenly, so the two axes are checked to be
 * perpendicular and of one length.
 *
 * @param {object} path The shape, in the element's own measure
 * @param {Object} attrs What the element says about itself
 * @param {string} id Which element, for the message
 * @returns {object} The shape, on the canvas
 * @throws {Error} If it is placed by anything but a matrix, or by one that
 *   scales it unevenly
 */
function moved(path, attrs, id) {
  if (!attrs.transform) return path

  const written = MATRIX.exec(attrs.transform)
  const values = written ? written[1].split(',').map(Number) : []
  if (values.length !== 6 || values.some(Number.isNaN)) {
    throw new Error(`${id} is placed by ${attrs.transform}, and a shape is placed by matrix(a, b, c, d, e, f)`)
  }

  const [a, b, c, d, e, f] = values
  const axis = Math.hypot(a, b)
  const side = Math.hypot(c, d)
  if (Math.abs(axis - side) > SQUARE * axis || Math.abs(a * c + b * d) > SQUARE * axis * side) {
    throw new Error(`${id} is placed by a transform that scales it unevenly, so its stroke would not follow it`)
  }

  const builder = new skia.PathBuilder()
  builder.addPath(path)
  builder.transform(a, c, e, b, d, f, 0, 0, 1)
  return builder.snapshot()
}

/**
 * The shapes one element comes to on the canvas: what it fills, and the shape
 * its stroke covers, in the order they are painted.
 *
 * A shape holding a hole says so with a fill rule, which Skia must be told
 * before that shape goes into an operation.
 *
 * @param {{tag: string, attrs: Object}} element One element
 * @returns {Array<{id: string, colour: string, path: object}>} The shapes
 * @throws {Error} If it draws no shape, or is placed in a way that cannot be
 *   followed
 */
function shapesOf(element) {
  const { attrs } = element
  const id = attrs.id ?? 'an element with no id'
  const own = shapeOf(element, id)

  const shapes = []
  if (attrs.fill && attrs.fill !== 'none') {
    const face = moved(own, attrs, id)
    if (attrs['fill-rule'] === 'evenodd') face.setFillType(skia.FillType.EvenOdd)
    shapes.push({ id, colour: attrs.fill, path: face })
  }
  if (attrs.stroke && attrs.stroke !== 'none') {
    shapes.push({ id, colour: attrs.stroke, path: moved(covered(own, attrs), attrs, id) })
  }
  return shapes
}

/**
 * One variant's elements cut into a single path.
 *
 * A drawing of one ink has no second colour to cover with, so a shape painted
 * the ground is taken out of what is already there rather than laid over it.
 * Walking the elements back to front, adding the ink and taking away the
 * ground, leaves the shape of the ink itself.
 *
 * The one element carries no id, because nothing selects it, and no fill rule,
 * because its contours are wound for the one SVG reads by default.
 *
 * A drawing that names no ground never takes anything away, so every shape adds.
 *
 * @param {Array<{tag: string, attrs: Object}>} elements Elements of one variant,
 *   back to front
 * @param {string} [ground] The colour that takes away rather than adds, where
 *   the drawing names one
 * @returns {Array<{tag: string, attrs: Object}>} The one element
 * @throws {Error} If the drawing is painted anything but one ink over its
 *   ground, if an element cannot be cut with, if nothing is left of the
 *   drawing, or if a contour cannot be turned about
 */
export function flatten(elements, ground) {
  const shapes = elements.flatMap((element) => shapesOf(element))
  const inks = new Set(shapes.map((shape) => shape.colour).filter((colour) => colour !== ground))
  if (inks.size !== 1) {
    throw new Error(
      `one path holds one ink over the ground, and this drawing holds ${inks.size}: ${[...inks].join(', ')}`,
    )
  }

  const ink = shapes.reduce((so, shape) => {
    const op = shape.colour === ground ? skia.PathOp.Difference : skia.PathOp.Union
    const cut = skia.Path.MakeFromOp(so, shape.path, op)
    if (!cut) throw new Error(`${shape.id} is a shape Skia cannot work the drawing out against`)
    return cut
  }, new skia.PathBuilder().snapshot())

  if (ink.isEmpty()) throw new Error('nothing is left of the drawing: the ground takes the whole of the ink out')

  return [{ tag: 'path', attrs: { fill: [...inks][0], d: shaped(ink) } }]
}
