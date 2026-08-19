/**
 * Reading the design in logo.yaml.
 *
 * The design says what the picture is made of, where each piece goes, and what
 * each level of detail changes. This turns it into the parts that draw it.
 *
 * A level says only what it changes from the level above it. Those changes are
 * merged over the parts one level at a time, so saying a value always wins and
 * leaving one out never puts it back.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'yaml'

import { Pencil } from './parts/pencil.js'
import { Sheet } from './parts/sheet.js'

/**
 * The frame a part names to be placed against the canvas rather than in
 * another part.
 *
 * @type {string}
 */
const OUTERMOST = 'canvas'

/**
 * The design, as it is written.
 *
 * @type {{palette: Object<string, string>, canvas: number, parts: Array<object>,
 *   levels: Array<object>}}
 */
const design = parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'logo.yaml'), 'utf8'))

/**
 * Kinds of part the design can name, and how each one is made.
 *
 * A part placed against the canvas is made on its own. A part placed in another
 * part is made from it, so it follows wherever that part goes.
 *
 * @type {Object<string, {alone?: function(object): object,
 *   within?: function(object, object): object}>}
 */
const KINDS = {
  sheet: { alone: (spec) => new Sheet(spec), within: (parent, spec) => parent.behind(spec) },
  pencil: { alone: (spec) => new Pencil(spec) },
  arrow: { within: (parent, spec) => parent.arrow(spec) },
  wordmark: { within: (parent, spec) => parent.write(spec) },
}

/**
 * The two ways the design can write a point, and how each one measures up
 * against the frame the part is placed in.
 *
 * Both run the same way: the first value across the frame, the second down it.
 * A distance is in the frame's own measure, a fraction is of the frame's own
 * width and height, so a fraction still means the same place when the frame is
 * cut to another size.
 *
 * @type {Array<{keys: string[],
 *   measure: function(Object, {w: number, h: number}): {x: number, y: number}}>}
 */
const POINTS = [
  { keys: ['x', 'y'], measure: (point) => ({ x: point.x, y: point.y }) },
  { keys: ['u', 'v'], measure: (point, box) => ({ x: point.u * box.w, y: point.v * box.h }) },
]

/**
 * The colours the design paints in, by the name it calls each one.
 *
 * @type {Object<string, string>}
 */
export const PALETTE = design.palette

/**
 * Edge length of the square canvas.
 *
 * @type {number}
 */
export const CANVAS = design.canvas

/**
 * The levels of detail, largest first.
 *
 * A level applies at its own size and below, so at a small size the levels
 * above it apply as well. A class says how small the drawing is, so each level
 * carries the classes it has to serve: its own and every smaller one.
 *
 * @type {Array<{name: string, upTo: number|null, title: string, classNames: string[]}>}
 */
export const LEVELS = design.levels.map((level, at) => ({
  name: level.name,
  upTo: level.upTo ?? null,
  title: level.title,
  classNames: level.class
    ? design.levels
        .slice(at)
        .map((smaller) => smaller.class)
        .filter(Boolean)
    : [],
}))

/**
 * Whether a value is a plain object, which is what merges deeply. A list or a
 * number is replaced whole.
 *
 * @param {*} value Anything
 * @returns {boolean} Whether it merges
 */
function plain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * One set of changes laid over another.
 *
 * @param {Object} base What is being changed
 * @param {Object} over What it is changed to
 * @returns {Object} The two merged
 */
function merged(base, over) {
  const result = { ...base }
  for (const [key, value] of Object.entries(over)) {
    result[key] = plain(value) && plain(base[key]) ? merged(base[key], value) : value
  }
  return result
}

/**
 * Turn the colour names a part is given into the colours themselves.
 *
 * @param {Object} spec One part, as the design says it
 * @returns {Object} The same part, painted
 * @throws {Error} If it names a colour the palette does not hold
 */
function painted(spec) {
  const colour = (name) => {
    if (!(name in PALETTE)) throw new Error(`${spec.id} is painted ${name}, which the palette does not hold`)
    return PALETTE[name]
  }
  return {
    ...spec,
    ...(spec.fill ? { fill: colour(spec.fill) } : {}),
    ...(spec.bare ? { bare: colour(spec.bare) } : {}),
    ...(spec.stroke ? { stroke: { ...spec.stroke, colour: colour(spec.stroke.colour) } } : {}),
  }
}

/**
 * One point as a distance in the frame's own measure, however it was written.
 *
 * @param {Object} point A point, written either way
 * @param {{w: number, h: number}} box How wide and how tall the frame is
 * @param {string} where Which point this is, for the message
 * @returns {{x: number, y: number}} Across the frame and down it
 * @throws {Error} If it is written as neither form, or as both at once
 */
function distance(point, box, where) {
  const written = Object.keys(point)
  const form = POINTS.find((candidate) => candidate.keys.every((key) => point[key] !== undefined))
  const stray = written.filter((key) => !form?.keys.includes(key))
  if (!form || stray.length) {
    throw new Error(
      `${where} is written ${written.join(', ')}: a point is x and y, a distance across the frame and ` +
        'down it, or u and v, the same two as fractions of the frame',
    )
  }
  return form.measure(point, box)
}

/**
 * Every point a part is given, as a distance in the frame it is placed in.
 *
 * @param {Object} spec One part, as the design says it
 * @param {{w: number, h: number}} box How wide and how tall that frame is
 * @returns {Object} The same part, measured
 * @throws {Error} If a point is written as neither form, or as both at once
 */
function measured(spec, box) {
  const isPoint = (value) => plain(value) && POINTS.some(({ keys }) => keys.some((key) => value[key] !== undefined))
  return Object.fromEntries(
    Object.entries(spec).map(([name, value]) => [
      name,
      isPoint(value) ? distance(value, box, `${spec.id}'s ${name}`) : value,
    ]),
  )
}

/**
 * Check that every part is placed in something that is there to hold it.
 *
 * @param {Array<Object>} specs The parts this level draws
 * @param {string} level Which level of detail, for the message
 * @throws {Error} If a part is placed in one the design does not hold, or in one
 *   this level leaves out
 */
function placeable(specs, level) {
  for (const spec of specs) {
    if (spec.in === OUTERMOST) continue
    if (specs.some((other) => other.id === spec.in)) continue
    throw new Error(
      design.parts.some((part) => part.id === spec.in)
        ? `${spec.id} is placed in ${spec.in}, which level ${level} does not draw`
        : `${spec.id} is placed in ${spec.in}, which is no part of the drawing`,
    )
  }
}

/**
 * The parts one level composes the picture from, in the order they are drawn.
 *
 * @param {string} level Which level of detail
 * @returns {Array<Object>} What each part is given
 * @throws {Error} If there is no such level, if a level changes a part the
 *   design does not hold, or if a part has nothing to be placed in
 */
function composed(level) {
  const found = design.levels.findIndex((candidate) => candidate.name === level)
  if (found < 0) throw new Error(`no such level: ${level}`)

  const changes = design.levels.slice(0, found + 1).map((above) => above.overrides ?? {})
  for (const change of changes) {
    for (const id of Object.keys(change)) {
      if (!design.parts.some((part) => part.id === id)) {
        throw new Error(`a level changes ${id}, which is no part of the drawing`)
      }
    }
  }

  const specs = design.parts
    .map((part) => changes.reduce((spec, change) => (change[spec.id] ? merged(spec, change[spec.id]) : spec), part))
    .filter((spec) => spec.show !== false)
    .map(painted)

  placeable(specs, level)
  return specs
}

/**
 * Make one part, from the part it is placed in where it names one.
 *
 * @param {Object} spec One part, as the design says it
 * @param {Map<string, object>} made The parts already made, by id
 * @returns {object} The part
 * @throws {Error} If it is of no known kind, cannot go where it is placed, or
 *   gives a point in neither form
 */
function make(spec, made) {
  const { is, in: within, show, ...rest } = spec
  const kind = KINDS[is]
  if (!kind) throw new Error(`${spec.id} is a ${is}, which is no kind of part`)

  if (within === OUTERMOST) {
    if (!kind.alone) throw new Error(`a ${is} cannot be placed against the canvas`)
    return kind.alone(measured(rest, { w: CANVAS, h: CANVAS }))
  }

  if (!kind.within) throw new Error(`a ${is} cannot be placed in another part`)
  const parent = made.get(within)
  if (!(parent instanceof Sheet)) {
    throw new Error(`${spec.id} is placed in ${within}, which is no frame to be placed in`)
  }
  return kind.within(parent, measured(rest, { w: parent.width, h: parent.height }))
}

/**
 * Make every part, each after the part it is placed in.
 *
 * The parts are listed in the order they are drawn, so a part can be placed in
 * one listed after it: the sheets behind the front sheet are drawn first and
 * made from it.
 *
 * @param {Array<Object>} specs The parts, as the design says them
 * @returns {Map<string, object>} The parts, by id
 * @throws {Error} If two parts are placed in each other
 */
function built(specs) {
  const made = new Map()
  let waiting = specs

  while (waiting.length) {
    const ready = waiting.filter((spec) => spec.in === OUTERMOST || made.has(spec.in))
    if (!ready.length) {
      throw new Error(`these parts are placed in each other: ${waiting.map((spec) => spec.id).join(', ')}`)
    }
    for (const spec of ready) made.set(spec.id, make(spec, made))
    waiting = waiting.filter((spec) => !made.has(spec.id))
  }

  return made
}

/**
 * Build every element of the logo, back to front.
 *
 * @param {string} [level] Which level of detail to draw
 * @returns {Array<{tag: string, attrs: Object}>} Elements
 * @throws {Error} If there is no such level
 */
export function logo(level = 'full') {
  const specs = composed(level)
  const made = built(specs)
  return specs.flatMap((spec) => made.get(spec.id).elements())
}
