/**
 * Which pieces of a component are drawn.
 */

/**
 * The pieces to draw, in the order they are drawn.
 *
 * @param {string[]} own Every piece the component has, in drawing order
 * @param {string[]} [asked] Which of them to draw, all of them by default
 * @param {string} whose What the component is, for the message
 * @returns {string[]} The names to draw
 * @throws {Error} If a name asked for is not one of the component's own
 */
export function drawn(own, asked, whose) {
  const names = asked ?? own
  for (const name of names) {
    if (!own.includes(name)) throw new Error(`${whose} has no part called ${name}`)
  }
  return names
}
