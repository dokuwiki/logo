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
 * A pencil pared down to a painted rod with a bare point on it.
 *
 * The band at the far end and the light along the middle facet are both finer
 * than the barrel, so below a certain size neither is a pixel wide and both go.
 * What is left is the paint and the wood, and it is the paint stopping short of
 * the point that says pencil rather than dash: a bar of colour, and the point
 * painted around an island of bare wood.
 *
 * So the barrel is stouter and the point longer than a whole pencil's, and the
 * wood is set well in from the cone's edges. The wood is the paper's own colour,
 * so the paint left around it is the only thing that draws the point's edge, and
 * that rim is a pixel wide at 40, where these sizes begin, and half of one at
 * 16, where they end. The wood stops short of the tip and reaches a little past
 * the shoulder, so the paint runs the whole way round it.
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
    // The first change of pose. Two things stop working here. An arrow's loop
    // encloses a gap of a pixel or two, so the arrows go: of the two things
    // lying on the paper, the pencils are the ones the mark is about. And the
    // pale paper needs an outline to be seen at all, which a tilted fan of
    // three sheets turns into a tangle of lines, so the stack stands upright
    // and compact, two sheets rather than three.
    // The pencils stay, pared down to paint and wood. Each keeps the slant the
    // whole drawing gives it and its place beside the other, red steep and
    // above, green shallow and below it and further left, because that
    // arrangement is what the mark is known by. Red lies across the right end of
    // the word mark, as it does in the whole drawing, and that is what leaves
    // room for both of them to be drawn nearly as large as the canvas takes.
    // Each runs off the paper at its blunt end, red past the top right corner
    // and green past the bottom right corner of the sheet behind, as they both
    // run off the paper in the whole drawing.
    // Everything is drawn as large as the canvas will take. The stack sits in
    // the top left corner with its outline on the canvas's own edge, and the
    // sheets are cut larger than the paper's own measure, because the room the
    // whole drawing keeps clear around the paper is empty at this size. Each
    // pencil is grown from the blunt end that rests on the canvas edge, red on
    // the right and green at the bottom, so a longer pencil is one whose point
    // reaches further back across the paper, and both are stouter than the
    // pared-down pencil. What stops the pair growing is the strip of paper
    // between red's point and green's barrel, which is down to a pixel and a
    // third at 24, the smallest size this level is drawn at. The two are drawn
    // at one scale, as the pair in the whole drawing is. The word mark is
    // written across the sheet, so it moves and grows with it, and the red
    // pencil lies across the foot of its last two strokes.
    // The paper's corners are rounded more than twice as hard, or the round the
    // whole drawing keeps is a pixel at 40 and the sheet reads as a plain
    // rectangle.
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
    // This level takes sm's pose whole and drops the two pieces of it that stop
    // reading at 20. The word mark goes: its letters stand four pixels tall
    // there and the strokes that draw them are finer than one, so they close up
    // into a smudge. The sheet behind goes with it: it peeks three quarters of a
    // pixel out at the side and one below, under an outline a third of a pixel
    // wide, which is an edge too close to the front sheet's to be read as
    // another sheet.
    // The paper is cut back to its own measure and set down and right by the
    // whole of what it lost, so its right and bottom edges lie where sm's do and
    // the room it gives up is all at the top left. Both pencils stay where sm
    // puts them, and each hangs further off the paper for it.
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
