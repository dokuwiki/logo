/**
 * Fill the navigation of the page that loads this file, so that every page
 * offers the same way to the others.
 *
 * The pages do not all sit at the same depth, so each address is worked out
 * from the project directory, which is two levels above this file wherever the
 * site is served from. The page being read says so, and the stylesheet draws it
 * as where the reader is.
 */

/**
 * The pages the navigation offers, in the order they are shown, each by where
 * it lives under the project directory and the words it is named by.
 *
 * @type {Array<{path: string, name: string}>}
 */
const PAGES = [
  { path: 'index.html', name: 'Files' },
  { path: 'src/serve/sizes.html', name: 'Sizes' },
  { path: 'src/serve/compare.html', name: 'Compare to Classic' },
  { path: 'src/serve/closeup.html', name: 'Close-up' },
]

/**
 * The project directory, as the page that loads this file reaches it.
 *
 * @type {URL}
 */
const ROOT = new URL('../../', import.meta.url)

/**
 * An address as the file it asks for, a directory read as the index it serves,
 * so that a page reached as a directory is the same page as its index.html.
 *
 * @param {string|URL} address Where a page is
 * @returns {string} The path of the file
 */
function fileOf(address) {
  return new URL(address).pathname.replace(/\/$/, '/index.html')
}

const here = fileOf(location.href)

for (const page of PAGES) {
  const address = new URL(page.path, ROOT)
  const link = document.createElement('a')
  link.href = address.href
  link.textContent = page.name
  if (fileOf(address) === here) link.setAttribute('aria-current', 'page')
  document.querySelector('nav').append(link)
}
