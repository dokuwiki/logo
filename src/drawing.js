/**
 * Reading a design file and composing what it draws.
 *
 * A design says what the picture is made of, where each piece goes, and what
 * each of its variants changes. This turns it into the parts that draw it.
 *
 * A variant says only what it changes from the variant above it. Those changes
 * are merged over the parts one variant at a time, so saying a value always
 * wins and leaving one out never puts it back.
 *
 * A design laid over another says only what it changes about it, the same way.
 * One picture is then drawn from another's parts, in the places that other
 * design puts them.
 */

import { existsSync, readFileSync } from 'node:fs'

import { parse } from 'yaml'

/**
 * The frame a part names to be placed against the canvas rather than in
 * another part.
 *
 * @type {string}
 */
const OUTERMOST = 'canvas'

/**
 * The two ways a design can write a point, and how each one measures up against
 * the frame the part is placed in.
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
 * A design file by the name it is called.
 *
 * @param {URL} file The file
 * @returns {string} Its name
 */
function named(file) {
  return decodeURIComponent(file.pathname).split('/').at(-1)
}

/**
 * One design, and the design it is laid over where it names one.
 *
 * The two merge the way a variant's changes merge over a part. A palette said
 * here is the one exception: it replaces the inherited palette rather than
 * adding to it, so a part painted a colour only the design below holds is an
 * error rather than quietly the colour it was.
 *
 * @param {URL} file The design file
 * @param {string[]} [laid] The designs already being read, outermost first
 * @returns {Object} The design, with whatever it is laid over merged under it
 * @throws {Error} If it is laid over a file that is not there, or over one
 *   already being read
 */
function design(file, laid = []) {
  const spec = parse(readFileSync(file, 'utf8'))
  if (!spec.from) return spec

  const under = new URL(spec.from, file)
  const chain = [...laid, file.href]
  if (chain.includes(under.href)) {
    throw new Error(
      `these designs are laid over each other: ${[...chain, under.href].map((one) => named(new URL(one))).join(', ')}`,
    )
  }
  if (!existsSync(under)) {
    throw new Error(`${named(file)} is laid over ${spec.from}, which is not there beside it`)
  }

  const base = design(under, chain)
  return { ...merged(base, spec), ...(spec.palette ? { palette: spec.palette } : {}) }
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
 * One drawing, as its design file describes it.
 */
export class Drawing {
  /**
   * Read a design.
   *
   * @param {object} spec What to compose
   * @param {URL} spec.file The design file, given as a URL so that it resolves
   *   beside the module naming it
   * @param {Object<string, {takes: string[], alone?: function(object): object,
   *   within?: function(object, object): object}>} spec.kinds The kinds of part
   *   this design can name, what each one can be told, and how each one is made.
   *   A part placed against the canvas is made on its own; a part placed in
   *   another part is made from it, so it follows wherever that part goes.
   */
  constructor({ file, kinds }) {
    /**
     * @type {{title: string, palette: Object<string, string>, canvas: number,
     *   parts: Array<object>, variants: Array<object>}} The design, with
     *   whatever it is laid over merged under it
     */
    this.design = design(file)
    /** @type {Object<string, object>} How each kind of part is made */
    this.kinds = kinds
  }

  /**
   * The accessible name every drawing of it carries.
   *
   * @returns {string} The name
   */
  get title() {
    return this.design.title
  }

  /**
   * The colours the design paints in, by the name it calls each one.
   *
   * @returns {Object<string, string>} The palette
   */
  get palette() {
    return this.design.palette
  }

  /**
   * The colour a part painted in it takes away with rather than adds, where the
   * drawing is cut into one shape.
   *
   * @returns {string|undefined} The colour, or nothing where the design names
   *   none
   * @throws {Error} If it names a colour the palette does not hold
   */
  get ground() {
    const name = this.design.ground
    if (name === undefined) return undefined
    if (!(name in this.palette)) throw new Error(`the ground is ${name}, which the palette does not hold`)
    return this.palette[name]
  }

  /**
   * Edge length of the square canvas.
   *
   * @returns {number} The canvas
   */
  get canvas() {
    return this.design.canvas
  }

  /**
   * The variants, largest or first named first.
   *
   * A variant that applies up to a size applies at that size and below, so at a
   * small size the variants above it apply as well. A class says how small the
   * drawing is, so each variant carries the classes it has to serve: its own and
   * every smaller one.
   *
   * Both mechanisms that pick a level by size read the levels in the order they
   * are given, so a design that lists them out of order draws the wrong one at
   * every size rather than saying so.
   *
   * @returns {Array<{name: string, class: string|undefined, upTo: number|null,
   *   classNames: string[]}>} The variants
   * @throws {Error} If the levels of detail are not listed largest first
   */
  get variants() {
    if (this.bySize) this.ordered()
    return this.design.variants.map((variant, at) => ({
      name: variant.name,
      class: variant.class,
      upTo: variant.upTo ?? null,
      classNames: variant.class
        ? this.design.variants
            .slice(at)
            .map((smaller) => smaller.class)
            .filter(Boolean)
        : [],
    }))
  }

  /**
   * Check that the levels of detail are listed largest first: a level that names
   * no size stands for every size and comes first, and each level after it names
   * a smaller size than the level before it.
   *
   * @returns {void}
   * @throws {Error} If a level does not apply below the one before it
   */
  ordered() {
    const reach = (level) => (level.upTo === undefined ? 'every size' : `up to ${level.upTo}`)
    const levels = this.design.variants

    for (let at = 1; at < levels.length; at++) {
      const larger = levels[at - 1]
      const smaller = levels[at]
      if (smaller.upTo !== undefined && (larger.upTo === undefined || smaller.upTo < larger.upTo)) continue
      throw new Error(
        `${smaller.name} applies ${reach(smaller)} and comes after ${larger.name}, which applies ` +
          `${reach(larger)}, and the levels are listed largest first`,
      )
    }
  }

  /**
   * Whether the variants are levels of detail chosen by the size the drawing is
   * wanted at, rather than versions of it that stand side by side.
   *
   * @returns {boolean} Whether a size picks between them
   */
  get bySize() {
    return this.design.variants.some((variant) => variant.upTo !== undefined)
  }

  /**
   * Turn the colour names a part is given into the colours themselves.
   *
   * @param {Object} spec One part, as the design says it
   * @returns {Object} The same part, painted
   * @throws {Error} If it names a colour the palette does not hold
   */
  painted(spec) {
    const colour = (name) => {
      if (!(name in this.palette)) throw new Error(`${spec.id} is painted ${name}, which the palette does not hold`)
      return this.palette[name]
    }
    return {
      ...spec,
      ...(spec.fill ? { fill: colour(spec.fill) } : {}),
      ...(spec.bare ? { bare: colour(spec.bare) } : {}),
      ...(spec.lead ? { lead: colour(spec.lead) } : {}),
      ...(spec.stroke ? { stroke: { ...spec.stroke, colour: colour(spec.stroke.colour) } } : {}),
      ...(spec.keyline ? { keyline: { ...spec.keyline, colour: colour(spec.keyline.colour) } } : {}),
    }
  }

  /**
   * Check that every part is placed in something that is there to hold it, and
   * that a part it says crosses it is one the drawing holds.
   *
   * Crossing is checked against the design and then cut down to what this variant
   * draws. A variant that drops a pencil heals the outline that pencil crossed,
   * rather than also having to stop naming it.
   *
   * @param {Array<Object>} specs The parts this variant draws
   * @param {string} variant Which variant, for the message
   * @returns {Array<Object>} The same parts, crossing only what is drawn
   * @throws {Error} If a part is placed in one the design does not hold, or in
   *   one this variant leaves out, or says it is crossed by no part at all
   */
  placeable(specs, variant) {
    const drawn = new Set(specs.map((spec) => spec.id))

    for (const spec of specs) {
      for (const id of spec.crossedBy ?? []) {
        if (this.design.parts.some((part) => part.id === id)) continue
        throw new Error(`${spec.id} is crossed by ${id}, which is no part of the drawing`)
      }
      if (spec.in === OUTERMOST) continue
      if (drawn.has(spec.in)) continue
      throw new Error(
        this.design.parts.some((part) => part.id === spec.in)
          ? `${spec.id} is placed in ${spec.in}, which variant ${variant} does not draw`
          : `${spec.id} is placed in ${spec.in}, which is no part of the drawing`,
      )
    }

    return specs.map((spec) =>
      spec.crossedBy ? { ...spec, crossedBy: spec.crossedBy.filter((id) => drawn.has(id)) } : spec,
    )
  }

  /**
   * The parts one variant composes the picture from, in the order they are
   * drawn.
   *
   * The design's own changes come first, so a variant's changes win over them.
   *
   * @param {string} variant Which variant
   * @returns {Array<Object>} What each part is given
   * @throws {Error} If there is no such variant, if a change names a part the
   *   design does not hold, or if a part has nothing to be placed in
   */
  composed(variant) {
    const found = this.design.variants.findIndex((candidate) => candidate.name === variant)
    if (found < 0) throw new Error(`no such variant: ${variant}`)

    const changes = [
      this.design.overrides ?? {},
      ...this.design.variants.slice(0, found + 1).map((above) => above.overrides ?? {}),
    ]
    for (const change of changes) {
      for (const id of Object.keys(change)) {
        if (!this.design.parts.some((part) => part.id === id)) {
          throw new Error(`${id} is changed, which is no part of the drawing`)
        }
      }
    }

    const specs = this.design.parts
      .map((part) => changes.reduce((spec, change) => (change[spec.id] ? merged(spec, change[spec.id]) : spec), part))
      .filter((spec) => spec.show !== false)
      .map((spec) => this.painted(spec))

    return this.placeable(specs, variant)
  }

  /**
   * Make one part, from the part it is placed in where it names one.
   *
   * A part others are placed in has to offer a width and a height in its own
   * measure, which is what the points inside it are fractions of.
   *
   * @param {Object} spec One part, as the design says it
   * @param {Map<string, object>} made The parts already made, by id
   * @returns {object} The part
   * @throws {Error} If it is of no known kind, is told something that kind is
   *   not told, cannot go where it is placed, or gives a point in neither form
   */
  make(spec, made) {
    const { is, in: within, crossedBy, show, ...rest } = spec
    const kind = this.kinds[is]
    if (!kind) throw new Error(`${spec.id} is a ${is}, which is no kind of part`)
    if (!kind.takes) throw new Error(`a ${is} says nothing of what it is told, so nothing can be told to one`)

    for (const name of Object.keys(rest)) {
      if (!kind.takes.includes(name)) throw new Error(`${spec.id} is given ${name}, which is nothing a ${is} is told`)
    }

    const crossing = crossedBy ? { crossedBy: crossedBy.map((id) => made.get(id)) } : {}

    if (within === OUTERMOST) {
      if (!kind.alone) throw new Error(`a ${is} cannot be placed against the canvas`)
      return kind.alone({ ...measured(rest, { w: this.canvas, h: this.canvas }), ...crossing })
    }

    if (!kind.within) throw new Error(`a ${is} cannot be placed in another part`)
    const parent = made.get(within)
    if (parent.width === undefined || parent.height === undefined) {
      throw new Error(`${spec.id} is placed in ${within}, which is no frame to be placed in`)
    }
    return kind.within(parent, { ...measured(rest, { w: parent.width, h: parent.height }), ...crossing })
  }

  /**
   * Make every part, each after the part it is placed in.
   *
   * The parts are listed in the order they are drawn, so a part can be placed in
   * one listed after it, or say it is crossed by one: the sheets behind the front
   * sheet are drawn first and made from it, and the sheet the pencils cross is
   * drawn before them.
   *
   * @param {Array<Object>} specs The parts, as the design says them
   * @returns {Map<string, object>} The parts, by id
   * @throws {Error} If two parts are placed in each other
   */
  built(specs) {
    const made = new Map()
    let waiting = specs

    while (waiting.length) {
      const ready = waiting.filter(
        (spec) =>
          (spec.in === OUTERMOST || made.has(spec.in)) && (spec.crossedBy ?? []).every((id) => made.has(id)),
      )
      if (!ready.length) {
        throw new Error(`these parts wait on each other: ${waiting.map((spec) => spec.id).join(', ')}`)
      }
      for (const spec of ready) made.set(spec.id, this.make(spec, made))
      waiting = waiting.filter((spec) => !made.has(spec.id))
    }

    return made
  }

  /**
   * Build every element of one variant, back to front.
   *
   * @param {string} [variant] Which variant to draw, the first by default
   * @returns {Array<{tag: string, attrs: Object}>} Elements
   * @throws {Error} If there is no such variant
   */
  elements(variant = this.design.variants[0].name) {
    const specs = this.composed(variant)
    const made = this.built(specs)
    return specs.flatMap((spec) => made.get(spec.id).elements())
  }
}
