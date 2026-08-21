/**
 * The inline-svg element, which pastes an SVG file into the page.
 *
 * The element names the file in src, as a path from the project directory, and
 * how many pixels across to draw it in size.
 *
 *   <inline-svg src="dist/dokuwiki-logo.svg" size="96" class="sz-md"></inline-svg>
 *
 * Pasting needs a script because no element loads a file as markup, and a
 * container query, a class rule and currentColor reach the drawing only on a
 * copy that lives in this page. A class on the element reaches the drawing,
 * because the pasted file's stylesheet is the page's and the element stands
 * above the drawing.
 */

/**
 * A drawing pasted into the page it stands in.
 */
class InlineSvg extends HTMLElement {
  /**
   * Every file asked for, by the path that named it, so that a file asked for
   * many times is read once. The read is kept rather than its result, so asks
   * made at once share one request. One map serves every element on the page.
   *
   * @type {Map<string, Promise<Element>>}
   */
  static #read = new Map()

  /**
   * The project directory, as the page that holds the element reaches it.
   *
   * @type {URL}
   */
  #root = new URL('../../', import.meta.url)

  /**
   * Draw when the element enters the page.
   *
   * @returns {void}
   */
  connectedCallback() {
    this.#draw()
  }

  /**
   * Put the drawing in the element.
   *
   * @returns {Promise<void>}
   */
  async #draw() {
    const src = this.getAttribute('src')
    if (!src) throw new Error('an inline-svg has no src to say which file to draw')

    const svg = document.importNode(await this.#drawing(src), true)

    const size = this.getAttribute('size')
    if (size) svg.style.width = svg.style.height = `${size}px`

    this.replaceChildren(svg)
  }

  /**
   * One file's drawing, ready to be copied into the page.
   *
   * @param {string} path Where the file is, from the project directory
   * @returns {Promise<Element>} Its svg element
   */
  #drawing(path) {
    if (!InlineSvg.#read.has(path)) {
      InlineSvg.#read.set(
        path,
        fetch(new URL(path, this.#root))
          .then((response) => {
            if (!response.ok) throw new Error(`${path} is not there to be drawn`)
            return response.text()
          })
          .then((source) => new DOMParser().parseFromString(source, 'image/svg+xml').documentElement),
      )
    }
    return InlineSvg.#read.get(path)
  }
}

customElements.define('inline-svg', InlineSvg)
