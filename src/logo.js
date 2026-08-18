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
import { GREEN, PAPER_BACK, RED } from './palette.js'

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
 * host can set for it, and how it composes the picture.
 *
 * A level with nothing of its own is not drawn yet. It still belongs here,
 * because its class stands for a size, and the levels above it have to serve
 * that class until it is drawn.
 *
 * @type {Array<{name: string, className: string|null, upTo: number|null, detail: object|undefined}>}
 */
const LADDER = [
  {
    name: 'full',
    className: null,
    upTo: null,
    detail: {
      front: { corner: { x: 119.4, y: 64.2 }, tilt: -5.3 },
      behind: [
        { id: 'sheet-back-far', tilt: -5.2, x: -130.5, y: 61.7 },
        { id: 'sheet-back-near', tilt: -9.7, x: -1.8, y: 126.9 },
      ],
      wordmark: { draws: ['brackets', 'letters'] },
      arrows: { width: 24 },
      red: { from: 0.34, to: { u: 0.404, v: 0.531 }, swing: 260, approach: 430 },
      green: { from: 0.571, to: { u: 0.431, v: 0.691 }, swing: 190, approach: 480 },
      pencils: [
        { id: 'pencil-red', colour: RED, at: { x: 463.2, y: 496.2 }, angle: -40, lean: 0.42 },
        { id: 'pencil-green', colour: GREEN, at: { x: 211.2, y: 657.1 }, angle: 24.9, lean: 0.54 },
      ],
    },
  },
  {
    // The ink that is already thinner than a pixel at 96 goes. The word mark
    // keeps its letters and loses its brackets, which are its thinnest
    // strokes, and the letters grow to fill most of the width all six
    // characters had. The arrows are a fifth thicker so their shafts do not
    // fade.
    name: 'md',
    className: 'sz-md',
    upTo: 96,
    detail: {
      wordmark: { draws: ['letters'], fills: 0.7 },
      arrows: { width: 29 },
    },
  },
  { name: 'sm', className: 'sz-sm', upTo: 40 },
  { name: 'xs', className: 'sz-xs', upTo: 20 },
]

/**
 * The levels that are drawn, largest first.
 *
 * A level applies at its own size and below, so at a small size the levels
 * above it apply as well. A class says how small the drawing is, so each level
 * carries the classes it has to serve: its own and every smaller one.
 *
 * @type {Array<{name: string, upTo: number|null, classNames: string[]}>}
 */
export const LEVELS = LADDER.filter((level) => level.detail).map((level) => ({
  name: level.name,
  upTo: level.upTo,
  classNames: level.className
    ? LADDER.slice(LADDER.indexOf(level))
        .map((smaller) => smaller.className)
        .filter(Boolean)
    : [],
}))

/**
 * How one level composes the picture.
 *
 * A level says only what it composes differently, so the pieces it leaves
 * alone come from the whole drawing.
 *
 * @param {string} level Which level of detail
 * @returns {object} What each piece is given
 * @throws {Error} If there is no such level, or it is not drawn yet
 */
function detailOf(level) {
  const found = LADDER.find((candidate) => candidate.name === level)
  if (!found) throw new Error(`no such level: ${level}`)
  if (!found.detail) throw new Error(`level ${level} is not drawn yet`)
  return { ...LADDER[0].detail, ...found.detail }
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
