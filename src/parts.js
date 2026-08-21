/**
 * Which pieces of a component are drawn.
 *
 * A component made of named pieces can be told to draw only some of them, so a
 * variant that cannot hold a piece leaves it out rather than the piece having to
 * know about sizes. Every such component answers the same way: draw what it is
 * asked for, all of it where it is asked for nothing, and say so where a name is
 * not one of its own.
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
