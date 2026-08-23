/**
 * How a part of the icon is painted.
 *
 * The icon comes in two styles, and every part of it answers to the same two
 * names.
 */

/**
 * A part drawn as a line.
 *
 * @type {string}
 */
export const OUTLINE = 'outline'

/**
 * A part filled solid.
 *
 * @type {string}
 */
export const SOLID = 'solid'

/**
 * The two ways a part can be painted.
 *
 * @type {string[]}
 */
export const PAINTINGS = [OUTLINE, SOLID]

/**
 * One way of painting, checked to be a way a part can be painted.
 *
 * @param {string} paint How the design says it is painted
 * @param {string} id Which part, for the message
 * @param {string} whose What kind of part it is, for the message
 * @returns {string} The same, where it is one of the two
 * @throws {Error} If it is painted in no way a part can be painted
 */
export function painting(paint, id, whose) {
  if (!PAINTINGS.includes(paint)) {
    throw new Error(`${id} is painted ${paint}, and a ${whose} is ${PAINTINGS.join(' or ')}`)
  }
  return paint
}
