/**
 * The site-nav element, which offers the way to every page of the site.
 *
 *   <site-nav></site-nav>
 *
 * The pages do not all sit at the same depth, so every address is worked out
 * from the project directory. The element wraps a nav, because a custom element
 * is no landmark and a reader looks for that one.
 */

/**
 * The navigation every page carries.
 */
class SiteNav extends HTMLElement {
  /**
   * The pages the navigation offers, in the order they are shown, each by where
   * it lives under the project directory.
   *
   * @type {Array<{path: string, name: string}>}
   */
  #pages = [
    { path: 'index.html', name: 'Files' },
    { path: 'src/serve/sizes.html', name: 'Sizes' },
    { path: 'src/serve/compare.html', name: 'Compare to classic' },
    { path: 'src/serve/vision.html', name: 'Colour vision' },
    { path: 'src/serve/closeup.html', name: 'Close-up' },
    { path: 'src/serve/icon.html', name: 'Icon' },
    { path: 'src/serve/line.html', name: 'Line art' },
    { path: 'src/serve/graphics.html', name: 'Graphics' },
  ]

  /**
   * The project directory, as the page that holds the element reaches it.
   *
   * @type {URL}
   */
  #root = new URL('../../', import.meta.url)

  /**
   * Fill the navigation when the element enters the page.
   *
   * @returns {void}
   */
  connectedCallback() {
    this.#fill()
  }

  /**
   * Put a link to every page in the element, the page being read marked as
   * current.
   *
   * @returns {void}
   */
  #fill() {
    const here = this.#fileOf(location.href)
    const nav = document.createElement('nav')

    for (const page of this.#pages) {
      const address = new URL(page.path, this.#root)
      const link = document.createElement('a')
      link.href = address.href
      link.textContent = page.name
      if (this.#fileOf(address) === here) link.setAttribute('aria-current', 'page')
      nav.append(link)
    }

    this.replaceChildren(nav)
  }

  /**
   * An address as the file it asks for, a directory read as the index it serves.
   *
   * @param {string|URL} address Where a page is
   * @returns {string} The path of the file
   */
  #fileOf(address) {
    return new URL(address).pathname.replace(/\/$/, '/index.html')
  }
}

customElements.define('site-nav', SiteNav)
