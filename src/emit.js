/**
 * Turning element descriptions into SVG text.
 */

/**
 * Trim a number to three decimals and drop any trailing zeros.
 *
 * @param {number} value Number to format
 * @returns {string} Shortest form that still reads the same
 */
export function round(value) {
  return String(Number(value.toFixed(3)))
}

/**
 * Format a transform matrix.
 *
 * The four numbers that turn and scale are kept to more decimals than a
 * coordinate is, because each of them multiplies a distance: three decimals of
 * a cosine would move the far corner of a sheet by a quarter of a unit. The
 * commas matter as well, because a matrix written this way is the one spelling
 * a transform attribute and a style declaration both read the same way.
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
  const turn = (value) => String(Number(value.toFixed(6)))
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
 * Format one attribute value. Numbers are trimmed, everything else is escaped.
 *
 * @param {string|number} value Attribute value
 * @returns {string} Quoted-ready value
 */
function attributeValue(value) {
  return typeof value === 'number' ? round(value) : escape(value)
}

/**
 * Serialise one element description.
 *
 * @param {{tag: string, attrs: Object<string, string|number>}} element Element
 * @param {string} indent Leading whitespace
 * @returns {string} One line of markup
 */
export function serialiseElement(element, indent) {
  const attrs = Object.entries(element.attrs)
    .map(([name, value]) => `${name}="${attributeValue(value)}"`)
    .join(' ')
  return `${indent}<${element.tag} ${attrs}/>`
}

/**
 * Serialise a comment.
 *
 * @param {string[]} lines Comment text, one entry per line
 * @param {string} indent Leading whitespace
 * @returns {string} A comment block
 * @throws {Error} If a line holds a double hyphen, which XML forbids
 */
export function serialiseComment(lines, indent) {
  for (const line of lines) {
    if (line.includes('--')) throw new Error(`double hyphen in comment: ${line}`)
  }
  const [first, ...rest] = lines
  const hanging = `${indent}     `
  return [`${indent}<!-- ${first}`, ...rest.map((line) => hanging + line)].join('\n') + ' -->'
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
 * @param {string[]} document.notes Lines for the header comment
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
    serialiseComment(document.notes, indent),
    ...(document.style?.length ? [serialiseStyle(document.style, indent)] : []),
    ...document.elements.map((element) => serialiseElement(element, indent)),
    '</svg>',
  ]
  return lines.join('\n') + '\n'
}
