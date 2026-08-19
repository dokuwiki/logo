/**
 * A pencil.
 *
 * Both pencils in the logo are this one component, drawn at different angles
 * and seen from different distances. The pencil itself is straight and even;
 * perspective sets the two apart. Each lies with its far end nearer the viewer
 * than its point, so it widens along its length.
 *
 * That widening is one number, the lean, and every part is drawn through it, so
 * the whole pencil agrees about where it is in space.
 */

import { Frame } from '../frame.js'
import { ellipse, inset, outline } from '../path.js'
import { lit } from '../palette.js'
import { Point } from '../plane.js'

/**
 * The pencil's own axis, which its parts are drawn along and across.
 *
 * @type {Point}
 */
const ALONG = new Point(1, 0)

/**
 * One pencil.
 */
export class Pencil {
  /**
   * What a pencil looks like, used unless a pencil is given its own.
   *
   * Lengths run along the pencil, widths across it.
   *
   * @type {Object<string, number>}
   */
  static proportions = {
    length: 689,
    barrelWidth: 146,
    coneLength: 109,
    endTaper: 45,
    endFace: 66,
    endNearFace: 80,
    bevel: 7,
    pointFrom: 50,
    pointTo: 113,
    pointRim: 12,
    pointChevron: 13,
    pointNearChevron: 5,
    pointBevel: 4,
    paintRim: 11,
    leadLength: 36,
    leadWidth: 55,
  }

  /**
   * Pencils of another shape, each pared down for a size the standard one
   * cannot hold, by the name the design asks for it by.
   *
   * A plain pencil is a painted rod with a bare point on it. The end and the
   * light along the facet are finer than the barrel, so below a pixel wide they
   * go. The paint stopping short of the point is then all that says pencil: a
   * bar of colour, and the point painted around an island of bare wood.
   *
   * So the barrel is stouter and the point longer, and the wood is set well in
   * from the cone's edges. The wood is the paper's colour, so the paint around
   * it draws the point's edge, and that rim measures a pixel at 40px and half of
   * one at 16px. The wood stops short of the tip and reaches past the shoulder,
   * so the paint runs the whole way round it.
   *
   * @type {Object<string, Object<string, number>>}
   */
  static shapes = {
    plain: {
      length: 600,
      barrelWidth: 155,
      coneLength: 150,
      endTaper: 22,
      endFace: 74,
      bevel: 10,
      pointFrom: 76,
      pointTo: 156,
      pointRim: 28,
      pointChevron: 0,
      pointNearChevron: 0,
      pointBevel: 6,
    },
  }

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
   * @param {string} spec.fill Barrel colour, unlit
   * @param {string} spec.bare Colour of the bare wood, at the point and at the end
   * @param {{x: number, y: number}} spec.at The sharpened point
   * @param {number} spec.turn Which way it points, in degrees
   * @param {number} spec.lean How much nearer the viewer its far end is, as a
   *   fraction of the pencil's own width
   * @param {string} [spec.highlight] Colour of the light on the facet, the
   *   barrel's colour lit by default
   * @param {number} [spec.size] How much larger than a standard pencil this one
   *   is drawn, which its frame carries, so a pencil of any size is the same
   *   shape
   * @param {string} [spec.shape] Which shape of pencil to draw, the standard
   *   one by default
   * @param {string[]} [spec.draws] Which parts to draw, all of them by default
   * @throws {Error} If there is no shape of that name
   */
  constructor({ id, fill, bare, at, turn, lean = 0, highlight = lit(fill), size = 1, shape, draws, ...proportions }) {
    Object.assign(this, Pencil.proportions, Pencil.shape(shape), proportions, {
      id,
      fill,
      bare,
      lean,
      highlight,
      size,
      draws,
    })
    /** @type {Frame} The pencil's own frame, running along it then across */
    this.frame = new Frame(at, turn)
  }

  /**
   * How much wider the pencil looks at a given point along it, because that
   * part of it is nearer the viewer.
   *
   * @param {number} along Distance from the sharpened point
   * @returns {number} What to multiply a width there by
   */
  nearness(along) {
    return 1 + (this.lean * along) / this.length
  }

  /**
   * A point on the pencil, seen from where the viewer stands, in the pencil's
   * own measure.
   *
   * @param {number} along Distance from the sharpened point
   * @param {number} across Distance from the axis on the pencil itself
   * @returns {import('../plane.js').Point} The point, along the pencil and
   *   across it
   */
  at(along, across) {
    return new Point(along, across * this.nearness(along))
  }

  /**
   * How wide the sharpened cone is at a given distance along the pencil.
   *
   * It opens evenly from the point to where it meets the barrel.
   *
   * @param {number} along Distance from the sharpened point
   * @returns {number} Half the width there
   */
  coneHalfWidth(along) {
    return (this.barrelWidth / 2) * Math.min(1, along / this.coneLength)
  }

  /**
   * The barrel's outline: the sharpened point, the cone opening out to the
   * barrel, the barrel widening toward the far end, and the chamfered end
   * face.
   *
   * @returns {string} Path data
   */
  barrel() {
    const at = (along, across) => this.at(along, across)
    const widest = this.length - this.endTaper
    return outline(
      [
        at(0, 0),
        at(this.coneLength, -this.barrelWidth / 2),
        at(widest, -this.barrelWidth / 2),
        at(this.length, -this.endFace / 2),
        at(this.length, this.endFace / 2),
        at(widest, this.barrelWidth / 2),
        at(this.coneLength, this.barrelWidth / 2),
      ],
      this.bevel,
    )
  }

  /**
   * Where the facet facing the viewer ends, as a fraction of the pencil's half
   * width.
   *
   * The barrel is a hexagonal rod, and the facet facing the viewer is bounded
   * by two edges running its length. Those edges are the end face's near
   * corners seen down the pencil, so this comes from the end face's own width.
   *
   * @returns {number} Fraction of the half width, from 0 to 1
   */
  get facetEdge() {
    return this.endNearFace / this.barrelWidth
  }

  /**
   * The light along the facet that faces the viewer.
   *
   * The facet is pulled in by the same rim the end's wood is, so the paint
   * shows as one rim of one width wherever the light stops: in from the facet's
   * own edges across the pencil, and in from the wood's edge at the sharpened
   * end. At the blunt end the light stops where the end face begins, because the
   * wood there is already a rim in from it.
   *
   * @returns {string} Path data
   */
  facet() {
    const at = (along, across) => this.at(along, across)
    const from = this.pointTo - this.pointChevron + this.paintRim
    const to = this.length - 2 * this.endTaper
    const edge = this.endNearFace / 2 - this.paintRim
    return outline([at(from, -edge), at(to, -edge), at(to, edge), at(from, edge)], this.bevel)
  }

  /**
   * The bare wood at the sharpened point: the cone again, pulled in by an even
   * rim so it follows whatever shape the cone is given, and stopping short of
   * both the tip and the shoulder.
   *
   * Where the wood meets the paint the edge steps back across the facet, which
   * is the rod's hexagonal section showing.
   *
   * @returns {string} Path data
   */
  point() {
    const at = (along, across) => this.at(along, across)
    const near = this.coneHalfWidth(this.pointFrom) - this.pointRim
    const far = this.coneHalfWidth(this.pointTo) - this.pointRim
    return outline(
      [
        at(this.pointFrom, -near),
        at(this.pointTo, -far),
        at(this.pointTo - this.pointChevron, -far * this.facetEdge),
        at(this.pointTo - this.pointChevron, far * this.facetEdge),
        at(this.pointTo, far),
        at(this.pointFrom, near),
        at(this.pointFrom - this.pointNearChevron, 0),
      ],
      this.pointBevel,
    )
  }

  /**
   * The six corners of the pencil's end face, where the viewer sees it.
   *
   * Four of them are on the barrel's own outline; the two nearest the point
   * are hidden under it. The bare wood at the end is pulled in from this same
   * hexagon, so the two agree.
   *
   * @returns {Array<import('../plane.js').Point>} The corners
   */
  endFaceCorners() {
    const widest = this.length - this.endTaper
    const near = this.length - 2 * this.endTaper
    return [
      this.at(near, -this.endNearFace / 2),
      this.at(widest, -this.barrelWidth / 2),
      this.at(this.length, -this.endFace / 2),
      this.at(this.length, this.endFace / 2),
      this.at(widest, this.barrelWidth / 2),
      this.at(near, this.endNearFace / 2),
    ]
  }

  /**
   * The bare wood of the blunt end, with the lead showing through it.
   *
   * The wood is the barrel's end face pulled in by an even rim, so a line of
   * paint shows all round it. The lead is cut out of the wood rather than drawn,
   * so the barrel shows through, which on a coloured pencil is the lead's own
   * colour.
   *
   * @returns {string} Path data for the wood and the lead cut out of it
   */
  end() {
    const corners = inset(this.endFaceCorners(), this.paintRim)
    const wood = outline(corners, this.bevel)
    const centre = corners
      .reduce((total, corner) => total.add(corner), corners[0].mult(0))
      .mult(1 / corners.length)
    const wider = this.nearness(this.length - this.endTaper * 1.5)
    const lead = ellipse(
      centre,
      { x: this.leadLength / 2, y: (this.leadWidth / 2) * wider },
      ALONG,
    )
    return `${wood} ${lead}`
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
      attrs: { id: `${this.id}-${part}`, fill, ...rest, transform: this.frame.matrix(this.size), d: data },
    }
  }

  /**
   * The pencil as drawable elements.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The parts this pencil draws
   * @throws {Error} If a part being drawn is not one of a pencil's own
   */
  elements() {
    const parts = {
      barrel: () => this.part('barrel', this.fill, this.barrel()),
      facet: () => this.part('facet', this.highlight, this.facet()),
      point: () => this.part('point', this.bare, this.point()),
      end: () => this.part('end', this.bare, this.end(), { 'fill-rule': 'evenodd' }),
    }

    const drawn = this.draws ?? Object.keys(parts)
    for (const name of drawn) {
      if (!parts[name]) throw new Error(`a pencil has no part called ${name}`)
    }
    return drawn.map((name) => parts[name]())
  }
}
