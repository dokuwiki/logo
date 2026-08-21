/**
 * A page, outlined or solid.
 *
 * The page is a rounded rectangle broken wherever a part crossing it needs the
 * room. The design says which parts cross it and how much clear space to keep
 * around them; where the breaks fall follows from where those parts are, so
 * moving one moves its break with it.
 *
 * Outlined, what is drawn is the runs the breaks leave: the outline stops short
 * of each crossing part and picks up again beyond it. Solid, the whole boundary
 * is filled and each crossing part is taken out of it, given the same clear
 * space, which cuts that part the slot it lies in.
 *
 * The boundary differs between the two: outlined it is the stroke's centre line,
 * solid it is the outer edge that stroke reaches, so the two paintings draw a
 * page of the same size.
 *
 * The outline always travels the same way round the page — rightwards along the
 * top, down the right edge, leftwards along the bottom, up the left edge, and on
 * round — and every distance round the page below is measured that way from the
 * top left corner.
 *
 * A Material icon is not turned, so the page is square to the canvas and its
 * points are already on it.
 */

import { compact, pen, shaped } from '../path.js'
import { Point, through } from '../plane.js'
import { skia } from '../skia.js'

/**
 * The four edges, in the order the outline travels them.
 *
 * @type {string[]}
 */
const EDGES = ['top', 'right', 'bottom', 'left']

/**
 * How a page can be painted.
 *
 * @type {string[]}
 */
const PAINTINGS = ['outline', 'solid']

/**
 * Overlapping stretches joined into one, in the order they come round the page,
 * each carrying the parts that took it out.
 *
 * Two stretches taken out by one part on either side of a corner meet exactly at
 * that corner, so joining them is what turns them into the one break that runs
 * round it.
 *
 * @param {Array<{from: number, to: number, part: object}>} stretches The stretches
 * @returns {Array<{from: number, to: number, parts: object[]}>} The breaks
 */
function joined(stretches) {
  const out = []
  for (const stretch of [...stretches].sort((one, other) => one.from - other.from)) {
    const last = out.at(-1)
    if (last && stretch.from <= last.to) {
      last.to = Math.max(last.to, stretch.to)
      if (!last.parts.includes(stretch.part)) last.parts.push(stretch.part)
    } else {
      out.push({ from: stretch.from, to: stretch.to, parts: [stretch.part] })
    }
  }
  return out
}

/**
 * One page, placed by the top left corner of the stroke it is drawn with.
 */
export class Page {
  /**
   * Place a page.
   *
   * @param {object} spec Where the page goes
   * @param {string} spec.id Element id, used as a prefix for what it draws
   * @param {{x: number, y: number}} spec.at Top left corner of the stroke's
   *   centre line
   * @param {{w: number, h: number}} spec.size How wide and how tall that centre
   *   line is
   * @param {number} spec.radius Radius that centre line's corners are rounded to
   * @param {string} spec.fill What it is filled with where it is solid
   * @param {{colour: string, width: number}} spec.stroke What it is drawn in
   *   where it is an outline and how heavy that is. The width still counts where
   *   it is solid, because it is what the outer edge stands off by
   * @param {Array<{bounds: Array<Point>, grown: function(number): string}>}
   *   [spec.crossedBy] The parts it breaks for, each offering the convex outline
   *   its breaks are measured against and its own shape given room to spare
   * @param {number} [spec.clear] How much space to leave between what is drawn
   *   and the parts crossing it
   * @param {string} [spec.paint] Whether it is an outline or solid
   * @throws {Error} If it is painted in no way a page can be painted, or crossed
   *   by a part that offers no outline to keep clear of
   */
  constructor({ id, at, size, radius, fill, stroke, crossedBy = [], clear = 0, paint = PAINTINGS[0] }) {
    if (!PAINTINGS.includes(paint)) {
      throw new Error(`${id} is painted ${paint}, and a page is ${PAINTINGS.join(' or ')}`)
    }

    /** @type {string} Element id */
    this.id = id
    /** @type {Point} Top left corner of the stroke's centre line */
    this.origin = new Point(at.x, at.y)
    /** @type {number} Width of that centre line */
    this.width = size.w
    /** @type {number} Height of that centre line */
    this.height = size.h
    /** @type {number} Radius its corners are rounded to */
    this.radius = radius
    /** @type {string} What it is filled with where it is solid */
    this.fill = fill
    /** @type {{colour: string, width: number}} What it is drawn in */
    this.stroke = stroke
    /** @type {Array<object>} The parts it breaks for */
    this.crossedBy = crossedBy
    /** @type {number} How much space to leave around them */
    this.clear = clear
    /** @type {string} Whether it is an outline or solid */
    this.paint = paint

    for (const part of this.crossedBy) {
      if (part.bounds) continue
      throw new Error(`${id} is crossed by ${part.id}, which offers no outline for it to keep clear of`)
    }
  }

  /**
   * Whether the page is filled rather than outlined.
   *
   * @returns {boolean} Whether it is solid
   */
  get solid() {
    return this.paint === 'solid'
  }

  /**
   * How far the boundary the runs are measured on stands outside the stroke's
   * centre line: nothing where the stroke is drawn on that line, half its width
   * where the page is solid and the boundary is the outer edge instead.
   *
   * @returns {number} The distance
   */
  get grown() {
    return this.solid ? this.stroke.width / 2 : 0
  }

  /**
   * Top left corner of that boundary.
   *
   * @returns {Point} The corner
   */
  get corner() {
    return new Point(this.origin.x - this.grown, this.origin.y - this.grown)
  }

  /**
   * How wide and how tall that boundary is.
   *
   * @returns {{w: number, h: number}} The span
   */
  get span() {
    return { w: this.width + 2 * this.grown, h: this.height + 2 * this.grown }
  }

  /**
   * Radius that boundary's corners are rounded to.
   *
   * @returns {number} The radius
   */
  get rounding() {
    return this.radius + this.grown
  }

  /**
   * How far that boundary stands off whatever crosses it.
   *
   * Outlined, the stroke reaches half its width past the centre line, at the end
   * of a run as a round cap, so the line is held off by that much more than the
   * clear space asks for. Solid, the boundary is the ink's own edge and the clear
   * space is the whole of it.
   *
   * @returns {number} The distance
   */
  get room() {
    return this.clear + this.stroke.width / 2 - this.grown
  }

  /**
   * How far it is all the way round the page, measured along its edges as if its
   * corners were square, which is the measure every distance round it is given
   * in.
   *
   * @returns {number} The distance
   */
  get perimeter() {
    return 2 * (this.span.w + this.span.h)
  }

  /**
   * A point on the boundary's box, given as fractions of its width and height.
   *
   * @param {number} u Fraction across, 0 at the left edge and 1 at the right
   * @param {number} v Fraction down, 0 at the top edge and 1 at the bottom
   * @returns {Point} The point on the canvas
   */
  at(u, v) {
    const span = this.span
    const corner = this.corner
    return new Point(corner.x + u * span.w, corner.y + v * span.h)
  }

  /**
   * One of the boundary's four edges: which corners it runs between, how long it
   * is, how far round the page the outline enters it, and whether along runs the
   * way the outline travels.
   *
   * Along means rightwards on the top and bottom edges and downwards on the left
   * and right ones, so on the bottom and left edges it runs against the way the
   * outline travels.
   *
   * @param {string} name Which edge
   * @returns {{from: number[], to: number[], length: number, entry: number,
   *   forward: boolean}} The edge
   * @throws {Error} If there is no such edge
   */
  edge(name) {
    const { w, h } = this.span
    const edges = {
      top: { from: [0, 0], to: [1, 0], length: w, entry: 0, forward: true },
      right: { from: [1, 0], to: [1, 1], length: h, entry: w, forward: true },
      bottom: { from: [0, 1], to: [1, 1], length: w, entry: w + h, forward: false },
      left: { from: [0, 0], to: [0, 1], length: h, entry: 2 * w + h, forward: false },
    }
    if (!edges[name]) throw new Error(`${this.id} has no ${name} edge`)
    return edges[name]
  }

  /**
   * Where a place on one of the edges sits.
   *
   * @param {{edge: string, along: number}} place An edge and how far along it
   * @returns {Point} The point on the canvas
   */
  onEdge(place) {
    const edge = this.edge(place.edge)
    return this.at(
      edge.from[0] + place.along * (edge.to[0] - edge.from[0]),
      edge.from[1] + place.along * (edge.to[1] - edge.from[1]),
    )
  }

  /**
   * How far round the page the outline has travelled when it reaches a place on
   * one of the edges.
   *
   * @param {{edge: string, along: number}} place An edge and how far along it
   * @returns {number} The distance
   */
  reach(place) {
    const edge = this.edge(place.edge)
    return edge.entry + (edge.forward ? place.along : 1 - place.along) * edge.length
  }

  /**
   * Where a distance round the page falls.
   *
   * @param {number} at How far round the page
   * @returns {Point} The point on the canvas
   */
  onward(at) {
    const perimeter = this.perimeter
    const round = ((at % perimeter) + perimeter) % perimeter
    const name = EDGES.find((edge) => round <= this.edge(edge).entry + this.edge(edge).length)
    const edge = this.edge(name)
    const along = (round - edge.entry) / edge.length
    return this.onEdge({ edge: name, along: edge.forward ? along : 1 - along })
  }

  /**
   * The boundary's four corners, in the order the outline reaches them: how far
   * round the page each one is, where it sits, and where the edge leaving it
   * heads.
   *
   * @returns {Array<{reach: number, point: Point, onward: Point}>} The corners
   */
  get corners() {
    const { w, h } = this.span
    const places = [
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ].map(([u, v]) => this.at(u, v))
    const reaches = [w, w + h, 2 * w + h, this.perimeter]
    return places.map((point, at) => ({
      reach: reaches[at],
      point,
      onward: places[(at + 1) % places.length],
    }))
  }

  /**
   * The stretches of the boundary the parts crossing it take out, joined and in
   * the order they come round the page.
   *
   * A part's breaks are measured against its convex outline rather than its own
   * shape, which is exact where a part crosses along a straight side of itself
   * and generous where it crosses on a corner or a curve of itself.
   *
   * @returns {Array<{from: number, to: number, parts: object[]}>} The breaks
   */
  get breaks() {
    const stretches = []
    for (const part of this.crossedBy) {
      for (const name of EDGES) {
        const cut = through(
          this.onEdge({ edge: name, along: 0 }),
          this.onEdge({ edge: name, along: 1 }),
          part.bounds,
          this.room,
        )
        if (!cut) continue
        const ends = [cut.enters, cut.leaves].map((along) => this.reach({ edge: name, along }))
        stretches.push({ from: Math.min(...ends), to: Math.max(...ends), part })
      }
    }
    return joined(stretches)
  }

  /**
   * A run pulled in until every corner it turns has the room its arc needs on
   * both sides. A corner that cannot be given that room is pushed out of the run
   * and into the break instead.
   *
   * Only a corner the run turns is asked for room. An end that stops short of a
   * corner it never reaches needs none, and pulling it back would swing the run
   * off the line the break was measured on.
   *
   * @param {{from: number, to: number}} run One run
   * @returns {{from: number, to: number}} The run, pulled in
   */
  offCorners(run) {
    const perimeter = this.perimeter
    let { from, to } = run
    for (const corner of this.corners) {
      for (const lap of [-perimeter, 0, perimeter]) {
        const at = corner.reach + lap
        if (at <= from || at >= to) continue
        if (at - from < this.rounding) from = at + this.rounding
        if (to - at < this.rounding) to = at - this.rounding
      }
    }
    return { from, to }
  }

  /**
   * The stretches of the boundary that are drawn: what the breaks leave, each
   * pulled clear of the corners it ends near.
   *
   * A run no longer than the stroke is a dot rather than a line, so it is left
   * out. Where nothing crosses the page at all, the one run is the whole of it.
   *
   * @returns {Array<{from: number, to: number, closed?: boolean}>} The runs
   * @throws {Error} If the breaks leave none of the boundary
   */
  get runs() {
    const perimeter = this.perimeter
    const breaks = this.breaks
    if (!breaks.length) return [{ from: this.span.w / 2, to: this.span.w / 2 + perimeter, closed: true }]

    const runs = breaks
      .map((stretch, at) => ({
        from: stretch.to,
        to: breaks[(at + 1) % breaks.length].from + (at + 1 === breaks.length ? perimeter : 0),
      }))
      .map((run) => this.offCorners(run))
      .filter((run) => run.to - run.from > this.stroke.width)

    if (!runs.length) throw new Error(`nothing is left of ${this.id}: what crosses it breaks the whole of its outline`)
    return runs
  }

  /**
   * The corners one run passes, in the order it reaches them.
   *
   * Each is given the corner after it as well, because that is the direction the
   * outline leaves in, which is what fixes the arc at the corner.
   *
   * @param {{from: number, to: number}} run One run
   * @returns {Array<{point: Point, onward: Point}>} The corners
   */
  turns(run) {
    return [0, this.perimeter]
      .flatMap((lap) => this.corners.map((corner) => ({ ...corner, reach: corner.reach + lap })))
      .filter((corner) => corner.reach > run.from && corner.reach < run.to)
      .sort((one, other) => one.reach - other.reach)
  }

  /**
   * One run as path data, closed where the run is the whole boundary.
   *
   * @param {{from: number, to: number, closed?: boolean}} run One run
   * @returns {string} Path data
   */
  data(run) {
    const path = pen()
    const start = this.onward(run.from)
    path.moveTo(start.x, start.y)
    for (const turn of this.turns(run)) {
      path.arcTo(turn.point.x, turn.point.y, turn.onward.x, turn.onward.y, this.rounding)
    }
    if (run.closed) {
      path.closePath()
    } else {
      const stop = this.onward(run.to)
      path.lineTo(stop.x, stop.y)
    }
    return compact(path.toString())
  }

  /**
   * The page's whole boundary as one closed shape, nothing taken out of it.
   *
   * @returns {string} Path data for one closed subpath
   */
  boundary() {
    return this.data({ from: this.span.w / 2, to: this.span.w / 2 + this.perimeter, closed: true })
  }

  /**
   * The page filled: its whole boundary with each part crossing it taken out,
   * given the clear space the design asks for.
   *
   * What is taken out is the part's own shape offset outward, so the cut follows
   * the part round its curves and corners and leaves an even margin. Skia does
   * the taking out.
   *
   * @returns {string} Path data
   */
  face() {
    const cut = this.crossedBy.reduce(
      (shape, part) =>
        skia.Path.MakeFromOp(shape, skia.Path.MakeFromSVGString(part.grown(this.room)), skia.PathOp.Difference),
      skia.Path.MakeFromSVGString(this.boundary()),
    )
    if (cut.isEmpty()) throw new Error(`nothing is left of ${this.id}: what crosses it takes the whole of it out`)
    return shaped(cut)
  }

  /**
   * The page as drawable elements: one path per run where it is an outline, one
   * filled path where it is solid.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The elements
   */
  elements() {
    if (this.solid) {
      return [{ tag: 'path', attrs: { id: `${this.id}-face`, fill: this.fill, d: this.face() } }]
    }
    return this.runs.map((run, at) => ({
      tag: 'path',
      attrs: {
        id: `${this.id}-run-${at + 1}`,
        fill: 'none',
        stroke: this.stroke.colour,
        'stroke-width': this.stroke.width,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        d: this.data(run),
      },
    }))
  }
}
