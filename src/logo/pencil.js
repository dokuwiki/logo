/**
 * A pencil.
 *
 * Both pencils in the logo are this one component, laid at different angles. It
 * is a silhouette: one width all the way, and a radius at every corner. The
 * blunt end's two corners take the radius the paper's own corners take, so the
 * pencils and the sheets they lie on are rounded by one measure.
 *
 * The bare wood at the point is an island in the barrel's paint. Where the wood
 * is the paper's colour and the pencil lies on the paper, wood reaching the
 * silhouette's edge reads as a hole cut through the pencil.
 *
 * Lengths run along the pencil from its point, widths across it.
 */

import { Frame } from '../frame.js'
import { drawn } from '../parts.js'
import { compact, grown, pen, shaped, shrunk } from '../path.js'
import { skia } from '../skia.js'

/**
 * One pencil.
 */
export class Pencil {
  /**
   * What a pencil looks like, used unless a pencil is given its own.
   *
   * @type {Object<string, number>}
   */
  static proportions = {
    length: 689,
    width: 152,
    cone: 150,
    nose: 18,
    shoulder: 20,
    end: 30,
    rim: 20,
    woodFrom: 70,
    woodTo: 148,
  }

  /**
   * Pencils of another shape, each cut back for a size the standard one cannot
   * hold, by the name the design asks for it by.
   *
   * The stout pencil is for the small sizes. At 24px the rim the standard pencil
   * gives the wood falls under a pixel and the paint round it breaks up, and the
   * round on its blunt end's corners reads as no round at all. Both are widened
   * here, the round to what the paper takes at that level.
   *
   * @type {Object<string, Object<string, number>>}
   */
  static shapes = {
    stout: {
      length: 600,
      width: 155,
      cone: 150,
      end: 50,
      rim: 28,
      woodFrom: 76,
      woodTo: 156,
      shoulder: 24,
    },
  }

  /**
   * What a design can tell a pencil, besides where it is placed and whether it
   * is drawn, which every part is told the same way. Every proportion can be
   * said outright, which is how a design tunes one pencil without giving it a
   * shape of its own.
   *
   * @type {string[]}
   */
  static takes = [
    'id',
    'fill',
    'bare',
    'lead',
    'at',
    'turn',
    'scale',
    'shape',
    'draws',
    'keyline',
    'stroke',
    ...Object.keys(Pencil.proportions),
  ]

  /**
   * What a named shape changes about the standard pencil.
   *
   * @param {string} [name] Which shape, the standard pencil by default
   * @returns {Object<string, number>} The proportions it sets
   * @throws {Error} If there is no shape of that name
   */
  static shape(name) {
    if (name === undefined) return {}
    if (!Pencil.shapes[name]) throw new Error(`a pencil has no shape called ${name}`)
    return Pencil.shapes[name]
  }

  /**
   * Lay a pencil down.
   *
   * @param {object} spec Where this pencil lies
   * @param {string} spec.id Element id, used as a prefix for each of its parts
   * @param {string} spec.fill Barrel colour
   * @param {string} spec.bare Colour of the bare wood at the point
   * @param {string} [spec.lead] Colour of the lead at the very tip, the barrel's
   *   own colour by default, as a coloured pencil's lead is
   * @param {{x: number, y: number}} spec.at The sharpened point
   * @param {number} spec.turn Which way it points, in degrees
   * @param {{colour: string, room: number}} [spec.keyline] What the pencil is
   *   drawn in where it keeps room from whatever lies behind it, and how much
   *   room that is
   * @param {{colour: string, width: number}} [spec.stroke] An outline round the
   *   barrel, for a drawing whose lines carry it
   * @param {number} [spec.scale] How much larger than a standard pencil this one
   *   is drawn, which its frame carries, so a pencil of any size is the same
   *   shape
   * @param {string} [spec.shape] Which shape of pencil to draw, the standard
   *   one by default
   * @param {string[]} [spec.draws] Which parts to draw, all but the lead by
   *   default
   * @param {number} [spec.length] Point to blunt end
   * @param {number} [spec.width] Across the barrel
   * @param {number} [spec.cone] How far back from the point the barrel begins
   * @param {number} [spec.nose] Radius the point itself is turned on
   * @param {number} [spec.shoulder] Radius the corners where the point meets the
   *   barrel are turned on
   * @param {number} [spec.end] Radius the two corners of the blunt end are
   *   turned on
   * @param {number} [spec.rim] How far the bare wood stands in from the
   *   silhouette's own edge, nothing to lay its edge along the barrel's, which is
   *   what an outlined pencil wants
   * @param {number} [spec.woodFrom] Where the bare wood begins
   * @param {number} [spec.woodTo] Where it ends
   * @throws {Error} If there is no shape of that name, if a round it asks for
   *   does not fit on the edges it is turned on, or if the rim is wider than half
   *   the narrowest part of the barrel
   */
  constructor({ id, fill, bare, at, turn, keyline, stroke, lead = fill, scale = 1, shape, draws, ...proportions }) {
    Object.assign(this, Pencil.proportions, Pencil.shape(shape), proportions, {
      id,
      fill,
      bare,
      lead,
      keyline,
      stroke,
      scale,
      draws,
    })
    this.check()
    /** @type {Frame} The pencil's own frame, running along it then across */
    this.frame = new Frame(at, turn)
    /** @type {object} The barrel pulled in by the rim, as Skia has it */
    this.inner = skia.Path.MakeFromSVGString(shrunk(this.barrel(), this.rim))
  }

  /**
   * Half the barrel's width, which is how far the silhouette stands from the
   * axis.
   *
   * @returns {number} The distance
   */
  get half() {
    return this.width / 2
  }

  /**
   * How far back along one of the point's two cuts the round at the point itself
   * reaches.
   *
   * @returns {number} The distance
   */
  get noseReach() {
    return this.nose / Math.tan(Math.atan2(this.half, this.cone))
  }

  /**
   * How far back along one of the point's two cuts the round at the shoulder
   * reaches.
   *
   * @returns {number} The distance
   */
  get shoulderReach() {
    return this.shoulder / Math.tan((Math.PI - Math.atan2(this.half, this.cone)) / 2)
  }

  /**
   * Check that the rounds asked for fit on the edges they are turned on.
   *
   * A round reaches back along both edges meeting at the corner it softens, so
   * two rounds sharing an edge have to fit on it between them, or the shape
   * crosses itself. The blunt end's corners are square, and a square corner
   * reaches back by its own radius.
   *
   * @returns {void}
   * @throws {Error} If a round does not fit
   */
  check() {
    const cut = Math.hypot(this.cone, this.half)
    if (this.noseReach + this.shoulderReach > cut) {
      throw new Error(
        `${this.id} rounds its point by ${this.nose} and its shoulders by ${this.shoulder}, which together ` +
          `reach further than the ${Math.round(cut)} its cuts are long`,
      )
    }
    if (this.shoulderReach + this.end > this.length - this.cone) {
      throw new Error(
        `${this.id} rounds its shoulders by ${this.shoulder} and the corners of its blunt end by ${this.end}, ` +
          `which together reach further than the ${Math.round(this.length - this.cone)} its barrel is long`,
      )
    }
    if (2 * this.end > this.width) {
      throw new Error(
        `${this.id} rounds both corners of its blunt end by ${this.end}, which together reach further than ` +
          `the ${this.width} that end is wide`,
      )
    }
  }

  /**
   * The barrel's outline: the point turned on its own radius, two cuts opening
   * out to the full width, the long run, and the blunt end cut flat across with
   * both of its corners turned on a radius of their own.
   *
   * @returns {string} Path data for one closed subpath
   */
  barrel() {
    const half = this.half
    const path = pen()

    // partway along one edge, so that no round starts where the path does
    const start = (this.cone + this.length) / 2
    path.moveTo(start, -half)
    path.arcTo(this.cone, -half, 0, 0, this.shoulder)
    path.arcTo(0, 0, this.cone, half, this.nose)
    path.arcTo(this.cone, half, this.length, half, this.shoulder)
    path.arcTo(this.length, half, this.length, -half, this.end)
    path.arcTo(this.length, -half, start, -half, this.end)
    path.closePath()
    return compact(path.toString())
  }

  /**
   * A stretch of the pencil: the barrel pulled in by the rim, cut to the two
   * places along it that the stretch runs between.
   *
   * Pulling the barrel in follows whatever shape it has, so a stretch is shaped
   * by the part of the pencil it lies on and keeps the same rim wherever it runs.
   *
   * @param {number} from Where the stretch begins
   * @param {number} to Where it ends
   * @param {string} which What this stretch is, for the message
   * @returns {string} Path data
   * @throws {Error} If it lies off the pencil, or is a shape Skia cannot work out
   */
  stretch(from, to, which) {
    const reach = this.width
    const strip = skia.Path.MakeFromSVGString(`M${from} ${-reach}H${to}V${reach}H${from}Z`)
    const piece = strip && skia.Path.MakeFromOp(this.inner, strip, skia.PathOp.Intersect)
    if (!piece) throw new Error(`the ${which} on ${this.id} is a shape Skia cannot work out`)
    if (piece.isEmpty()) {
      throw new Error(
        `the ${which} on ${this.id} runs from ${from} to ${to}, which leaves nothing once the rim of ` +
          `${this.rim} is taken off the pencil`,
      )
    }
    return shaped(piece)
  }

  /**
   * One part of the pencil as a path, drawn in the pencil's own measure and put
   * on the canvas by its frame.
   *
   * @param {string} part What to call this part
   * @param {string} fill What colour it is
   * @param {string} data Path data
   * @param {Object} [rest] Anything else to say about it
   * @returns {{tag: string, attrs: Object}} Element
   */
  part(part, fill, data, rest = {}) {
    return {
      tag: 'path',
      attrs: { id: `${this.id}-${part}`, fill, ...rest, transform: this.frame.matrix(this.scale), d: data },
    }
  }

  /**
   * The attributes a part carrying an outline is drawn with.
   *
   * A design asks for an outline in the drawing's own measure, as it does for
   * every other outline, and the pencil is drawn in its own measure at a scale.
   * Dividing by that scale makes the two agree.
   *
   * @returns {Object} The attributes, or nothing where the pencil has no outline
   */
  get outline() {
    if (!this.stroke) return {}
    return {
      stroke: this.stroke.colour,
      'stroke-width': this.stroke.width / this.scale,
      'stroke-linejoin': 'round',
    }
  }

  /**
   * The pencil as drawable elements.
   *
   * The keyline is the room the pencil keeps from whatever lies behind it, the
   * barrel pushed outward by that much. Where the pencil lies on paper it is
   * invisible; where it lies over ink it opens an even gap. A pencil given no
   * keyline has no part of that name to draw.
   *
   * The lead is the one part a pencil has and does not draw unless it is asked
   * for: it is the barrel's own colour, so a solid barrel draws it already.
   *
   * Every part carries the outline, not the barrel alone: a part painted the
   * ground cuts the barrel's outline where the two overlap, and its own outline
   * is what puts that back.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The parts this pencil draws
   * @throws {Error} If a part being drawn is not one of a pencil's own
   */
  elements() {
    const parts = {
      ...(this.keyline
        ? { keyline: () => this.part('keyline', this.keyline.colour, grown(this.barrel(), this.keyline.room)) }
        : {}),
      barrel: () => this.part('barrel', this.fill, this.barrel(), this.outline),
      lead: () => this.part('lead', this.lead, this.stretch(0, this.woodFrom, 'lead'), this.outline),
      point: () => this.part('point', this.bare, this.stretch(this.woodFrom, this.woodTo, 'bare wood'), this.outline),
    }

    const own = Object.keys(parts)
    return drawn(own, this.draws ?? own.filter((name) => name !== 'lead'), 'a pencil').map((name) => parts[name]())
  }
}
