/**
 * The logo, composed from its parts.
 *
 * This is the whole design: what the picture is made of and where each piece
 * goes. Everything else about how a piece looks belongs to the piece.
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
 * Build every element of the logo, back to front.
 *
 * @returns {Array<{tag: string, attrs: Object}>} Elements
 */
export function logo() {
  const front = new Sheet({ id: 'sheet-front', corner: { x: 119.4, y: 64.2 }, tilt: -5.3 })

  const parts = [
    front.behind({ id: 'sheet-back-far', tilt: -5.2, x: -130.5, y: 61.7, fill: PAPER_BACK }),
    front.behind({ id: 'sheet-back-near', tilt: -9.7, x: -1.8, y: 126.9, fill: PAPER_BACK }),
    front,
    front.write({ id: 'wordmark', text: '[[DW]]', width: 0.769, top: 0.113 }),
    front.arrow({
      id: 'arrow-red',
      colour: RED,
      edge: 'left',
      from: 0.34,
      to: { u: 0.404, v: 0.531 },
      swing: 260,
      approach: 430,
    }),
    front.arrow({
      id: 'arrow-green',
      colour: GREEN,
      edge: 'right',
      from: 0.571,
      to: { u: 0.431, v: 0.691 },
      swing: 190,
      approach: 480,
    }),
    new Pencil({
      id: 'pencil-red',
      colour: RED,
      at: { x: 463.2, y: 496.2 },
      angle: -40,
      lean: 0.42,
    }),
    new Pencil({
      id: 'pencil-green',
      colour: GREEN,
      at: { x: 211.2, y: 657.1 },
      angle: 24.9,
      lean: 0.54,
    }),
  ]

  return parts.flatMap((part) => part.elements())
}
