/**
 * The logo's colours.
 */

/**
 * Front of a sheet of paper.
 *
 * @type {string}
 */
export const PAPER = '#faf4dc'

/**
 * Back of a sheet of paper, used for the sheets behind the front one.
 *
 * @type {string}
 */
export const PAPER_BACK = '#ece5c8'

/**
 * The red pencil and the red arrow.
 *
 * It is the paint out of the light, which is most of what the drawing shows of
 * it: the barrel and the whole of the arrow. The one facet the light falls on
 * is this colour lit.
 *
 * Light enough to hold its own against a dark page, because the arrow's loop
 * swings off the paper and the paper is not always white.
 *
 * @type {string}
 */
export const RED = '#a62d2a'

/**
 * The green pencil and the green arrow.
 *
 * The paint out of the light, as the red is. Darker than a fresh green would
 * be, so that it carries the same weight as the red beside it and stays legible
 * where it lies on the paper.
 *
 * @type {string}
 */
export const GREEN = '#326633'

/**
 * Writing on the paper.
 *
 * @type {string}
 */
export const INK = '#4a6174'

/**
 * How much brighter a colour is where its surface faces the light.
 *
 * @type {number}
 */
const LIGHT = 1.28

/**
 * A colour as it looks on a surface that faces the light.
 *
 * The whole colour is scaled, so the hue and how saturated it is both hold and
 * only the lightness rises: a lit surface is the same paint in more light
 * rather than a colour of its own. A channel that would pass the top of the
 * range stops there.
 *
 * @param {string} colour Colour the surface is painted, as #rrggbb
 * @returns {string} The colour to draw that surface in, as #rrggbb
 */
export function lit(colour) {
  const channels = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16))
  const lift = (value) => Math.min(255, Math.round(value * LIGHT))
  return `#${channels.map((value) => lift(value).toString(16).padStart(2, '0')).join('')}`
}
