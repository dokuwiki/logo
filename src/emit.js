/**
 * Turning element descriptions into SVG text.
 */

/**
 * How many decimals a coordinate keeps.
 *
 * One number for everything that writes one, because a path written as steps
 * from one coordinate to the next is exact only where both were rounded the
 * same.
 *
 * @type {number}
 */
export const DIGITS = 2

/**
 * Trim a number to the decimals a coordinate keeps and drop any trailing zeros.
 *
 * @param {number} value Number to format
 * @returns {string} Shortest form that still reads the same
 */
export function round(value) {
  return String(Number(value.toFixed(DIGITS)))
}

/**
 * Format a transform matrix.
 *
 * The four numbers that turn and scale are kept to more decimals than a
 * coordinate is, because each of them multiplies a distance. The commas suit
 * both readers: a style declaration needs them, a transform attribute takes
 * them.
 *
 * @param {number} a How much of x the new x takes
 * @param {number} b How much of x the new y takes
 * @param {number} c How much of y the new x takes
 * @param {number} d How much of y the new y takes
 * @param {number} e How far it moves across
 * @param {number} f How far it moves down
 * @returns {string} Value for a transform attribute
 */
export function matrix(a, b, c, d, e, f) {
  const turn = (value) => String(Number(value.toFixed(5)))
  return `matrix(${turn(a)}, ${turn(b)}, ${turn(c)}, ${turn(d)}, ${round(e)}, ${round(f)})`
}

/**
 * Escape the characters that cannot appear in XML text or in an attribute
 * value.
 *
 * @param {string} text Raw text
 * @returns {string} Text safe to place in the document
 */
function escape(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Format one attribute value.
 *
 * A value that is not one would be written out as the word undefined, or as NaN,
 * which is a file drawing nothing where a part was meant to be. A part that left
 * something out says so here rather than in what a reader makes of the file.
 *
 * @param {string|number} value Attribute value
 * @param {string} name Which attribute, for the message
 * @param {string} where Which element, for the message
 * @returns {string} The value to put between the quotes
 * @throws {Error} If it is nothing at all, or a number that is not one
 */
function attributeValue(value, name, where) {
  if (value === undefined || value === null || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new Error(`${where} says its ${name} is ${value}, which is no value to write`)
  }
  return typeof value === 'number' ? round(value) : escape(value)
}

/**
 * Replace each element's id with the initials of the name the design gives it.
 *
 * A level writes three rules for every element it touches, so a long id is paid
 * for many times over. Initials keep the name traceable: arrow-red-shaft
 * becomes ars.
 *
 * @param {Array<{tag: string, attrs: Object}>} elements Elements of one level
 * @returns {Array<{tag: string, attrs: Object}>} The same elements, named short
 * @throws {Error} If two names come down to the same initials
 */
export function shorten(elements) {
  const taken = new Map()
  return elements.map((element) => {
    const name = element.attrs.id
    const id = name.split('-').map((word) => word[0]).join('')
    const clash = taken.get(id)
    if (clash && clash !== name) throw new Error(`${name} and ${clash} both come down to ${id}`)
    taken.set(id, name)
    return { ...element, attrs: { ...element.attrs, id } }
  })
}

/**
 * Serialise one element description.
 *
 * @param {{tag: string, attrs: Object<string, string|number>}} element Element
 * @param {string} indent Leading whitespace
 * @returns {string} One line of markup
 * @throws {Error} If an attribute says nothing at all, or a number that is not
 *   one
 */
export function serialiseElement(element, indent) {
  const where = element.attrs.id ?? `a ${element.tag}`
  const attrs = Object.entries(element.attrs)
    .map(([name, value]) => `${name}="${attributeValue(value, name, where)}"`)
    .join(' ')
  return `${indent}<${element.tag} ${attrs}/>`
}

/**
 * Serialise a stylesheet.
 *
 * @param {string[]} lines Lines of CSS
 * @param {string} indent Leading whitespace
 * @returns {string} A style element
 * @throws {Error} If a line holds a character that would end the element early
 */
export function serialiseStyle(lines, indent) {
  for (const line of lines) {
    if (/[<&]/.test(line)) throw new Error(`markup character in a style rule: ${line}`)
  }
  const body = lines.map((line) => (line === '' ? '' : `${indent}  ${line}`))
  return [`${indent}<style>`, ...body, `${indent}</style>`].join('\n')
}

/**
 * Assemble a whole SVG document.
 *
 * @param {object} document Document description
 * @param {number} document.size Canvas edge length in user units
 * @param {string} document.title Accessible name of the drawing
 * @param {string[]} [document.style] Lines of CSS the file carries
 * @param {Array<{tag: string, attrs: Object}>} document.elements Drawn elements
 * @returns {string} The complete file, ending in a newline
 */
export function serialiseDocument(document) {
  const indent = '  '
  const lines = [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    `     viewBox="0 0 ${round(document.size)} ${round(document.size)}"`,
    `     width="${round(document.size)}" height="${round(document.size)}"`,
    '     role="img">',
    `${indent}<title>${escape(document.title)}</title>`,
    ...(document.style?.length ? [serialiseStyle(document.style, indent)] : []),
    ...document.elements.map((element) => serialiseElement(element, indent)),
    '</svg>',
  ]
  return lines.join('\n') + '\n'
}
