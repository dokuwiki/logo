/**
 * How light falls on the logo's colours.
 *
 * The colours themselves are named in logo.yaml, which is where the design
 * chooses what each part is painted.
 */

/**
 * How much brighter a colour is where its surface faces the light.
 *
 * @type {number}
 */
const LIGHT = 1.28

/**
 * A colour as it looks on a surface that faces the light.
 *
 * Every channel is scaled by the same factor, so the hue holds and only the
 * lightness rises. A channel that would pass the top of the range stops there.
 *
 * @param {string} colour Colour the surface is painted, as #rrggbb
 * @returns {string} The colour to draw that surface in, as #rrggbb
 * @throws {Error} If it is not written as #rrggbb
 */
export function lit(colour) {
  if (!/^#[0-9a-f]{6}$/i.test(colour)) {
    throw new Error(`the light on ${colour} cannot be worked out: a colour it falls on is written #rrggbb`)
  }
  const channels = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16))
  const lift = (value) => Math.min(255, Math.round(value * LIGHT))
  return `#${channels.map((value) => lift(value).toString(16).padStart(2, '0')).join('')}`
}
