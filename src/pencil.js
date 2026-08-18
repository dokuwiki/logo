/**
 * A pencil.
 *
 * Both pencils in the logo are this one component, drawn at different angles
 * and seen from different distances. The pencil itself is straight and even:
 * a cone at the sharpened end, a barrel of one width, and a metal band whose
 * face is turned toward the viewer.
 *
 * What makes the two look different is perspective. Each pencil lies with its
 * far end nearer the viewer than its point, so it widens along its length.
 * That is one number, the lean, and it is applied to every part at once, so
 * the barrel, the wood, the band and the core all agree about where the
 * pencil is in space.
 */

import { Frame } from './frame.js'
import { ellipse, inset, outline } from './path.js'
import { PAPER } from './palette.js'
import { Point } from './plane.js'

/**
 * The pencil's own axis, which is where its parts are drawn: along it and
 * across it, with the frame putting them on the canvas afterwards.
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
    woodFrom: 50,
    woodTo: 113,
    woodRim: 12,
    woodChevron: 13,
    woodNearChevron: 5,
    woodBevel: 4,
    bandRim: 11,
    coreLength: 36,
    coreWidth: 55,
  }

  /**
   * Lay a pencil down.
   *
   * @param {object} spec Where this pencil lies
   * @param {string} spec.id Element id, used as a prefix for the two parts
   * @param {string} spec.colour Barrel colour
   * @param {{x: number, y: number}} spec.at The sharpened point
   * @param {number} spec.angle Which way it points, in degrees
   * @param {number} spec.lean How much nearer the viewer its far end is, as a
   *   fraction of the pencil's own width
   * @param {string} [spec.paper] Colour of the bare wood and the band's face
   * @param {number} [spec.scale] How much larger than a standard pencil this
   *   one is drawn, which its frame carries rather than its proportions, so
   *   that a pencil of any size is the same shape drawn larger
   */
  constructor({ id, colour, at, angle, lean = 0, paper = PAPER, scale = 1, ...proportions }) {
    Object.assign(this, Pencil.proportions, proportions, { id, colour, lean, paper, scale })
    /** @type {Frame} The pencil's own frame, running along it then across */
    this.frame = new Frame(at, angle)
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
   * Every part of the pencil is drawn this way and the frame puts the whole of
   * it on the canvas, so where the pencil lies and how large it is drawn are
   * one attribute rather than a set of outlines of their own.
   *
   * @param {number} along Distance from the sharpened point
   * @param {number} across Distance from the axis on the pencil itself
   * @returns {import('./plane.js').Point} The point, along the pencil and
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
   * @param {number} along Distance from the frame's origin
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
   * Where the pencil's middle facet ends, as a fraction of its half width.
   *
   * The barrel is a hexagonal rod. The facet facing the viewer is bounded by
   * two edges running the length of the pencil, and this is where they sit.
   * The end face's own near edge is the same two edges seen head on, so the
   * two agree by construction.
   *
   * @returns {number} Fraction of the half width, from 0 to 1
   */
  get facet() {
    return this.endNearFace / this.barrelWidth
  }

  /**
   * The bare wood of the sharpened cone: the cone again, pulled in by an even
   * rim so it follows whatever shape the cone is given, and stopping short of
   * both the point and the shoulder.
   *
   * Where the wood meets the paint the edge steps across the middle facet
   * rather than coming to a point, which is the rod's hexagonal section
   * showing.
   *
   * @returns {string} Path data
   */
  wood() {
    const at = (along, across) => this.at(along, across)
    const near = this.coneHalfWidth(this.woodFrom) - this.woodRim
    const far = this.coneHalfWidth(this.woodTo) - this.woodRim
    return outline(
      [
        at(this.woodFrom, -near),
        at(this.woodTo, -far),
        at(this.woodTo - this.woodChevron, -far * this.facet),
        at(this.woodTo - this.woodChevron, far * this.facet),
        at(this.woodTo, far),
        at(this.woodFrom, near),
        at(this.woodFrom - this.woodNearChevron, 0),
      ],
      this.woodBevel,
    )
  }

  /**
   * The metal band's face, with the graphite core cut out of it.
   *
   * It is a hexagon lying across the pencil, and a slightly skewed one: it is
   * the pencil's hexagonal section seen at an angle, so its two ends are not
   * the same width and its widest corners do not sit opposite each other.
   *
   * @returns {string} Path data for the face and the core
   */
  /**
   * The six corners of the pencil's end face, where the viewer sees it.
   *
   * Four of them are on the barrel's own outline; the two nearest the point
   * are hidden under the barrel. The band's face is this same hexagon, so the
   * two always agree.
   *
   * @returns {Array<import('./plane.js').Point>} The corners
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
   * The metal band's face, with the graphite core cut out of it.
   *
   * The face is the end face pulled in by an even rim of barrel colour, so
   * each of its edges runs parallel to the barrel edge outside it.
   *
   * @returns {string} Path data for the face and the core
   */
  band() {
    const corners = inset(this.endFaceCorners(), this.bandRim)
    const face = outline(corners, this.bevel)
    const middle = corners
      .reduce((total, corner) => total.add(corner), corners[0].mult(0))
      .mult(1 / corners.length)
    const along = (this.length - this.endTaper * 1.5) / this.length
    const core = ellipse(
      middle,
      { x: this.coreLength / 2, y: (this.coreWidth / 2) * (1 + this.lean * along) },
      ALONG,
    )
    return `${face} ${core}`
  }

  /**
   * The pencil as drawable elements.
   *
   * @returns {Array<{tag: string, attrs: Object}>} The barrel and the paper parts
   */
  elements() {
    const place = this.frame.matrix(this.scale)
    return [
      { tag: 'path', attrs: { id: `${this.id}-body`, fill: this.colour, transform: place, d: this.barrel() } },
      {
        tag: 'path',
        attrs: {
          id: `${this.id}-paper`,
          fill: this.paper,
          'fill-rule': 'evenodd',
          transform: place,
          d: `${this.wood()} ${this.band()}`,
        },
      },
    ]
  }
}
