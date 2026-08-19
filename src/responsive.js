/**
 * Turning the levels of detail into a stylesheet.
 *
 * The markup is the full drawing and the stylesheet takes away from it, so a
 * renderer that ignores the stylesheet still draws the real logo.
 *
 * A level's rules are the step from the level above it, which holds because
 * every mechanism that carries them reaches each level above the one in force:
 * a max-width that matches at one size matches at every smaller size, and a
 * level's class rules name the smaller levels' classes as well.
 *
 * Three mechanisms carry the rules, so each level's rules are written three
 * times. A media query measures the drawing where the file is its own document,
 * a container query measures it where the file is pasted into a page, and a
 * class on the root serves a host that says the size itself. The class carries
 * the most weight, so a host that says the size outright wins.
 */

import { round } from './emit.js'

/**
 * Attributes a rule can override, and how each one is written as a declaration
 * value.
 *
 * Width, height and rx are here because SVG 2 makes a shape's size and the
 * round of its corners properties. Each takes a unit, which the attribute of
 * the same name does without.
 *
 * @type {Object<string, function(string|number): string>}
 */
const PROPERTIES = {
  d: (value) => `path("${written(value)}")`,
  display: written,
  fill: written,
  height: (value) => `${written(value)}px`,
  rx: (value) => `${written(value)}px`,
  stroke: written,
  'stroke-width': written,
  transform: written,
  width: (value) => `${written(value)}px`,
}

/**
 * What a property means where the markup does not set it, so a level can put
 * it back after a larger level changed it.
 *
 * @type {Object<string, string>}
 */
const UNSET = {
  display: 'inline',
  transform: 'none',
}

/**
 * Write a value the way the markup writes it, so a level is compared against
 * what the file draws.
 *
 * @param {string|number} value Attribute value
 * @returns {string} The value as it appears in the file
 */
function written(value) {
  return typeof value === 'number' ? round(value) : String(value)
}

/**
 * Index a level's elements by their id, which is what a rule selects them by.
 *
 * @param {Array<{tag: string, attrs: Object}>} elements Elements of one level
 * @returns {Map<string, Object>} Attributes of each element
 * @throws {Error} If an element carries no id, or two carry the same one
 */
function byId(elements) {
  const found = new Map()
  for (const element of elements) {
    const id = element.attrs.id
    if (!id) throw new Error(`a ${element.tag} has no id, so no rule could reach it`)
    if (found.has(id)) throw new Error(`two elements share the id ${id}`)
    found.set(id, element.attrs)
  }
  return found
}

/**
 * The value that puts an attribute back the way the markup draws it, for a
 * level that stops setting what a larger level set.
 *
 * @param {Object} attrs The element's attributes in the markup
 * @param {string} id Element id, for the message
 * @param {string} name Attribute name
 * @returns {string} Declaration value
 * @throws {Error} If nothing is known that puts it back
 */
function putBack(attrs, id, name) {
  if (attrs[name] !== undefined) return PROPERTIES[name](attrs[name])
  if (UNSET[name] !== undefined) return UNSET[name]
  throw new Error(`cannot put ${name} back on ${id}: the markup does not set it`)
}

/**
 * The step from one level to the next.
 *
 * An element a larger level dropped can come back, because the markup holds it
 * either way and showing it again is one declaration.
 *
 * @param {Map<string, {attrs: Object, shown: boolean}>} state How each element
 *   stands, which this updates
 * @param {Map<string, Object>} level This level's elements
 * @param {Map<string, Object>} markup The full drawing's elements
 * @returns {Map<string, Map<string, string>>} Declarations, by element id
 * @throws {Error} If the level changes an attribute no rule can carry
 */
function changes(state, level, markup) {
  const changed = new Map()

  for (const [id, was] of state) {
    const smaller = level.get(id)
    const declarations = new Map()

    if (!smaller) {
      if (was.shown) declarations.set('display', 'none')
      was.shown = false
    } else {
      if (!was.shown) declarations.set('display', UNSET.display)
      for (const name of new Set([...Object.keys(was.attrs), ...Object.keys(smaller)])) {
        if (name === 'id') continue
        if (written(was.attrs[name] ?? '') === written(smaller[name] ?? '')) continue
        if (!PROPERTIES[name]) throw new Error(`${id} changes ${name}, which is no CSS property`)
        const value = smaller[name] === undefined
          ? putBack(markup.get(id), id, name)
          : PROPERTIES[name](smaller[name])
        declarations.set(name, value)
      }
      state.set(id, { attrs: smaller, shown: true })
    }

    if (declarations.size) changed.set(id, declarations)
  }
  return changed
}

/**
 * What a rule sets, written out.
 *
 * @param {Map<string, string>} declarations What it sets
 * @returns {string} The declarations
 */
function body(declarations) {
  return [...declarations].map(([name, value]) => `${name}: ${value}`).join('; ')
}

/**
 * One rule, on one line.
 *
 * @param {string} selector What it applies to
 * @param {Map<string, string>} declarations What it sets
 * @returns {string} The rule
 */
function rule(selector, declarations) {
  return `${selector} { ${body(declarations)} }`
}

/**
 * Gather the elements a level says the same thing about, so one rule can name
 * them all.
 *
 * @param {Map<string, Map<string, string>>} rules Declarations, by element id
 * @returns {Array<{ids: string[], declarations: Map<string, string>}>} The
 *   elements, gathered by what is said about them, in the order they first
 *   appear
 */
function gather(rules) {
  const groups = new Map()
  for (const [id, declarations] of rules) {
    const said = body(declarations)
    if (groups.has(said)) groups.get(said).ids.push(id)
    else groups.set(said, { ids: [id], declarations })
  }
  return [...groups.values()]
}

/**
 * The stylesheet the responsive file carries.
 *
 * @param {Array<{name: string, upTo: number|null, classNames: string[], elements: Array}>} compositions
 *   The levels, largest first, each with its elements
 * @returns {string[]} Lines of CSS, unindented
 * @throws {Error} If a level draws an element the markup does not hold
 */
export function stylesheet(compositions) {
  const [whole, ...smaller] = compositions
  const markup = byId(whole.elements)

  const lines = [
    '/* so a container query can measure the drawing */',
    'svg { container-type: size }',
  ]

  const state = new Map([...markup].map(([id, attrs]) => [id, { attrs, shown: true }]))
  for (const level of smaller) {
    const elements = byId(level.elements)
    for (const id of elements.keys()) {
      if (!markup.has(id)) throw new Error(`${id} is drawn only at a smaller level, so the markup cannot hold it`)
    }

    const rules = gather(changes(state, elements, markup))
    const query = `(max-width: ${round(level.upTo)}px)`
    const inside = rules.map(({ ids, declarations }) => `  ${rule(ids.map((id) => `#${id}`).join(', '), declarations)}`)

    lines.push('', `/* ${level.name}, ${round(level.upTo)}px and below */`)
    lines.push(`@media ${query} {`, ...inside, '}')
    lines.push(`@container ${query} {`, ...inside, '}')
    lines.push(
      ...rules.map(({ ids, declarations }) => {
        const selector = ids.flatMap((id) => level.classNames.map((name) => `.${name} #${id}`)).join(', ')
        return rule(selector, declarations)
      }),
    )
  }

  return lines
}
