/**
 * The icon: its design file and the kinds of part it is drawn from.
 */

import { Drawing } from '../drawing.js'
import { Page } from './page.js'
import { Pencil } from './pencil.js'

/**
 * The icon, as icon.yaml composes it.
 *
 * A page and a pencil both lie on the canvas, so neither is made from the other.
 *
 * @type {Drawing}
 */
export const icon = new Drawing({
  file: new URL('icon.yaml', import.meta.url),
  kinds: {
    page: { takes: Page.takes, alone: (spec) => new Page(spec) },
    pencil: { takes: Pencil.takes, alone: (spec) => new Pencil(spec) },
  },
})
