/**
 * The logo, composed from its parts.
 *
 * This is the whole design: what the picture is made of and where each piece
 * goes. Everything else about how a piece looks belongs to the piece.
 *
 * The picture is drawn at several levels of detail, so that it still reads
 * when it is small. A level is the same parts composed differently, not a
 * second drawing, so every level is written here.
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
 * It is set as one run of text however the parts are divided, so the letters
 * stay spaced as one piece.
 *
 * @type {Array<{name: string, text: string}>}
 */
const WORDMARK = [
  { name: 'brackets', text: '[[' },
  { name: 'letters', text: 'DW' },
  { name: 'brackets', text: ']]' },
]

/**
 * Every level of detail, largest first: the size it answers to, the class a
 * host can set for it, what it draws in words, and how it composes the
 * picture.
 *
 * The whole drawing is composed a shade inside the canvas, at the measure the
 * paper is cut to, so that the outlines and the pencils' ends have somewhere to
 * go. A sheet takes that measure from the paper; a pencil is told it.
 *
 * A level with nothing of its own is not drawn yet. It still belongs here,
 * because its class stands for a size, and the levels above it have to serve
 * that class until it is drawn.
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
    // The ink that is already thinner than a pixel at 96 goes. The word mark
    // keeps its letters and loses its brackets, which are its thinnest
    // strokes, and the letters grow to fill most of the width all six
    // characters had. The arrows are a fifth thicker so their shafts do not
    // fade, and the sheets are outlined half again as heavily, or by 48, where
    // this level hands over, the paper's edge is half a pixel and breaks up.
    // The sheets lie where they lie in the whole drawing; they are written out
    // again only to carry that outline.
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
    // The first change of pose. The tilted fan and the tight arrow loops are
    // what stop working here: a loop encloses a gap of a pixel or two, and the
    // pale paper needs an outline to be seen at all. So the stack stands
    // upright and compact, two sheets rather than three, and each arrow keeps
    // its curve but opens it out: it comes out from behind the paper's edge,
    // hooks clear of it and sweeps across the sheet, red pointing right above
    // and green pointing left below. The word mark keeps the room at the top of
    // the sheet, so the arrows sit under it. The pencils are past reading and
    // go. The paper's corners are rounded more than twice as hard, or the
    // round the whole drawing keeps is a pixel at 40 and the sheet reads as a
    // plain rectangle.
    name: 'sm',
    className: 'sz-sm',
    upTo: 40,
    title: 'A red and a green arrow across a stack of DW pages',
    detail: {
      front: { corner: { x: 180, y: 63 }, tilt: 0, radius: 64, stroke: INK, strokeWidth: 24 },
      behind: [{ id: 'sheet-back-near', tilt: 0, x: 38.7, y: 58.1, stroke: INK, strokeWidth: 16 }],
      wordmark: { draws: ['letters'], fills: 0.76 },
      arrows: { width: 64, headLength: 130, headSpread: 38 },
      red: { from: 0.42, to: { u: 0.8, v: 0.58 }, swing: 300, approach: 320 },
      green: { from: 0.68, to: { u: 0.2, v: 0.86 }, swing: 300, approach: 320 },
      pencils: [],
    },
  },
  {
    // The pose sm takes, pared down. What sm still draws around the sheet stops
    // working here: the sheet behind is a second outline a pixel from the
    // first, and the word mark's letters are three pixels tall. Both go, and
    // the one sheet that is left grows to the height of the canvas, keeping the
    // paper's proportions, so what little the mark holds fills the frame. The
    // arrows move up into the room the word mark leaves. A wider sheet leaves
    // less canvas beside it, so each arrow's loop swings out less far, or it
    // would run off the edge.
    // What sm draws in half a pixel is thickened: the outline by two thirds and
    // the arrows by half, which brings the outline to near a pixel at 20 and
    // the shafts above one. A head grows with its shaft, or a thicker shaft
    // swallows it and the arrow ends in a stub. The corners are rounded harder
    // again, to two pixels and a half at 20, so the round is still seen at the
    // sizes below that.
    name: 'xs',
    className: 'sz-xs',
    upTo: 20,
    title: 'A red and a green arrow across a page',
    detail: {
      front: { corner: { x: 124, y: 20 }, tilt: 0, width: 776, height: 984, radius: 130, stroke: INK, strokeWidth: 40 },
      behind: [],
      wordmark: { draws: [] },
      arrows: { width: 96, headLength: 165, headSpread: 38 },
      red: { from: 0.29, to: { u: 0.8, v: 0.45 }, swing: 180, approach: 320 },
      green: { from: 0.55, to: { u: 0.2, v: 0.73 }, swing: 180, approach: 320 },
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
 * A level says only what it composes differently from the level above it, so
 * the pieces it leaves alone come from there. The levels pile up, which is how
 * a small level can take the pose of the level above and change one piece of
 * it.
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

  const elements = parts.flatMap((part) => part.elements())
  if (!detail.crisp) return elements

  // a shape this small covers so few pixels that smoothing greys out more of it
  // than it draws, so its edges are asked for where they fall
  return elements.map((element) => ({
    ...element,
    attrs: { ...element.attrs, 'shape-rendering': 'crispEdges' },
  }))
}
