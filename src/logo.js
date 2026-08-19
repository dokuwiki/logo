/**
 * The logo, composed from its parts.
 *
 * This is the whole design: what the picture is made of and where each piece
 * goes. Everything else about how a piece looks belongs to the piece.
 *
 * The picture is drawn at several levels of detail, so that it still reads
 * when it is small. A level is the same parts composed differently, so every
 * level is written here.
 */

import { Pencil } from './pencil.js'
import { Sheet } from './sheet.js'
import { GREEN, INK, PAPER_BACK, RED } from './palette.js'

/**
 * Edge length of the square canvas.
 *
 * @type {number}
 */
export const CANVAS = 1024

/**
 * The word mark, in the parts a level can leave out.
 *
 * @type {Array<{name: string, text: string}>}
 */
const WORDMARK = [
  { name: 'brackets', text: '[[' },
  { name: 'letters', text: 'DW' },
  { name: 'brackets', text: ']]' },
]

/**
 * A pencil pared down to a painted rod with a bare point on it.
 *
 * The band and the light along the middle facet are finer than the barrel, so
 * below a pixel wide they go. The paint stopping short of the point is then all
 * that says pencil: a bar of colour, and the point painted around an island of
 * bare wood.
 *
 * So the barrel is stouter and the point longer, and the wood is set well in
 * from the cone's edges. The wood is the paper's colour, so the paint around it
 * draws the point's edge, and that rim measures a pixel at 40px and half of
 * one at 16px. The wood stops short of the tip and reaches past the shoulder,
 * so the paint runs the whole way round it.
 *
 * @type {object}
 */
const PLAIN_PENCIL = {
  draws: ['body', 'wood'],
  length: 600,
  barrelWidth: 150,
  coneLength: 150,
  endTaper: 22,
  endFace: 74,
  bevel: 10,
  woodFrom: 76,
  woodTo: 156,
  woodRim: 28,
  woodChevron: 0,
  woodNearChevron: 0,
  woodBevel: 6,
}

/**
 * Every level of detail, largest first.
 *
 * The whole drawing is composed a shade inside the canvas, so the outlines and
 * the pencils' ends have somewhere to go. A sheet takes that measure from the
 * paper; a pencil is told it.
 *
 * A level with no detail of its own is not drawn yet. Its class still stands
 * for a size, so the levels above it have to serve that class.
 *
 * @type {Array<{name: string, className: string|null, upTo: number|null, title: string, detail: object|undefined}>}
 */
const LADDER = [
  {
    name: 'full',
    className: null,
    upTo: null,
    title: 'Red and green pencils and arrows over a stack of [[DW]] pages',
    detail: {
      front: { corner: { x: 132, y: 78.6 }, tilt: -5.3, stroke: INK, strokeWidth: 12 },
      behind: [
        { id: 'sheet-back-far', tilt: -5.2, x: -126.3, y: 59.7, stroke: INK, strokeWidth: 8 },
        { id: 'sheet-back-near', tilt: -9.7, x: -1.7, y: 122.8, stroke: INK, strokeWidth: 8 },
      ],
      wordmark: { draws: ['brackets', 'letters'] },
      arrows: { width: 24 },
      red: { from: 0.34, to: { u: 0.404, v: 0.531 }, swing: 260, approach: 430 },
      green: { from: 0.571, to: { u: 0.431, v: 0.691 }, swing: 190, approach: 480 },
      pencils: [
        { id: 'pencil-red', colour: RED, at: { x: 464.8, y: 496.7 }, angle: -40, lean: 0.42, scale: 0.968 },
        { id: 'pencil-green', colour: GREEN, at: { x: 220.9, y: 652.4 }, angle: 24.9, lean: 0.54, scale: 0.968 },
      ],
    },
  },
  {
    // The ink already thinner than a pixel at 96px goes: the word mark loses
    // its brackets, its thinnest strokes, and its letters grow to fill most of
    // the width all six characters had. The arrows thicken by a fifth and the
    // sheets' outlines by more than half, because by 48px, the smallest size
    // this level serves, the paper's edge is half a pixel and breaks up. The
    // sheets are written out again to carry that outline.
    name: 'md',
    className: 'sz-md',
    upTo: 96,
    title: 'Red and green pencils and arrows over a stack of DW pages',
    detail: {
      front: { corner: { x: 132, y: 78.6 }, tilt: -5.3, stroke: INK, strokeWidth: 20 },
      behind: [
        { id: 'sheet-back-far', tilt: -5.2, x: -126.3, y: 59.7, stroke: INK, strokeWidth: 14 },
        { id: 'sheet-back-near', tilt: -9.7, x: -1.7, y: 122.8, stroke: INK, strokeWidth: 14 },
      ],
      wordmark: { draws: ['letters'], fills: 0.7 },
      arrows: { width: 29 },
    },
  },
  {
    // The first change of pose. An arrow's loop encloses a gap of a pixel or
    // two, so the arrows go and the pencils carry the mark. The pale paper
    // needs an outline to be seen, which a tilted fan of three sheets turns
    // into a tangle of lines, so the stack stands upright and compact: two
    // sheets, cut larger than the paper's own measure, with the outline on the
    // canvas's own edge. The pencils keep the slant and the arrangement the
    // whole drawing gives them, red steep and above, green shallow and below it
    // and further left, because the mark is known by that. Each is grown from
    // the blunt end that rests on the canvas edge, both at one scale. The pair
    // can grow no further than the strip of paper between red's point and
    // green's barrel allows, which is down to a pixel and a third at 24px. The
    // paper's corners are rounded more than twice as hard, or the round the
    // whole drawing keeps is a pixel at 40px and reads as a plain rectangle.
    name: 'sm',
    className: 'sz-sm',
    upTo: 40,
    title: 'Red and green pencils over a stack of DW pages',
    detail: {
      front: { corner: { x: 12, y: 12 }, tilt: 0, width: 720, height: 913, radius: 64, stroke: INK, strokeWidth: 24 },
      behind: [{ id: 'sheet-back-near', tilt: 0, x: 38.7, y: 58.1, stroke: INK, strokeWidth: 16 }],
      wordmark: { draws: ['letters'], fills: 0.76 },
      arrows: { draws: [] },
      pencils: [
        { id: 'pencil-red', colour: RED, ...PLAIN_PENCIL, barrelWidth: 155, at: { x: 395.5, y: 568.1 }, angle: -40, scale: 1.28 },
        { id: 'pencil-green', colour: GREEN, ...PLAIN_PENCIL, barrelWidth: 155, at: { x: 159.2, y: 625.7 }, angle: 24.9, scale: 1.28 },
      ],
    },
  },
  {
    // This level takes sm's pose and drops the two pieces of it that stop
    // reading at 20px. The word mark goes: its letters stand four pixels tall
    // and their strokes are finer than one, so they close up into a smudge. The
    // sheet behind goes too: it peeks three quarters of a pixel out at the side
    // under an outline a third of a pixel wide, too close to the front sheet's
    // edge to read as another sheet. The paper is cut back to its own measure
    // and set down and right by what it lost, so its right and bottom edges lie
    // where sm's do. Both pencils stay where sm puts them, and each hangs
    // further off the paper for it.
    name: 'xs',
    className: 'sz-xs',
    upTo: 20,
    title: 'A red and a green pencil on a page',
    detail: {
      front: { corner: { x: 68, y: 83 }, tilt: 0, radius: 64, stroke: INK, strokeWidth: 24 },
      behind: [],
      wordmark: { draws: [] },
    },
  },
]

/**
 * The levels that are drawn, largest first.
 *
 * A level applies at its own size and below, so at a small size the levels
 * above it apply as well. A class says how small the drawing is, so each level
 * carries the classes it has to serve: its own and every smaller one.
 *
 * @type {Array<{name: string, upTo: number|null, title: string, classNames: string[]}>}
 */
export const LEVELS = LADDER.filter((level) => level.detail).map((level) => ({
  name: level.name,
  upTo: level.upTo,
  title: level.title,
  classNames: level.className
    ? LADDER.slice(LADDER.indexOf(level))
        .map((smaller) => smaller.className)
        .filter(Boolean)
    : [],
}))

/**
 * How one level composes the picture.
 *
 * A level says what it composes differently from the level above it, and the
 * pieces it leaves alone come from there.
 *
 * @param {string} level Which level of detail
 * @returns {object} What each piece is given
 * @throws {Error} If there is no such level, or it is not drawn yet
 */
function detailOf(level) {
  const found = LADDER.findIndex((candidate) => candidate.name === level)
  if (found < 0) throw new Error(`no such level: ${level}`)
  if (!LADDER[found].detail) throw new Error(`level ${level} is not drawn yet`)
  return LADDER.slice(0, found + 1).reduce((detail, above) => ({ ...detail, ...above.detail }), {})
}

/**
 * Build every element of the logo, back to front.
 *
 * @param {string} [level] Which level of detail to draw
 * @returns {Array<{tag: string, attrs: Object}>} Elements
 * @throws {Error} If there is no such level, or it is not drawn yet
 */
export function logo(level = 'full') {
  const detail = detailOf(level)
  const front = new Sheet({ id: 'sheet-front', ...detail.front })

  const parts = [
    ...detail.behind.map((behind) => front.behind({ fill: PAPER_BACK, ...behind })),
    front,
    front.write({ id: 'wordmark', parts: WORDMARK, width: 0.769, top: 0.113, ...detail.wordmark }),
    front.arrow({ id: 'arrow-red', colour: RED, edge: 'left', ...detail.arrows, ...detail.red }),
    front.arrow({ id: 'arrow-green', colour: GREEN, edge: 'right', ...detail.arrows, ...detail.green }),
    ...detail.pencils.map((pencil) => new Pencil(pencil)),
  ]

  return parts.flatMap((part) => part.elements())
}
