/**
 * The icon: its design file and the kinds of part it is drawn from.
 */

import { Drawing } from '../drawing.js'
import { Page } from './page.js'
import { Pencil } from './pencil.js'
import { Rectangle } from '../logo/rectangle.js'

/**
 * The icon, as icon.yaml composes it.
 *
 * The page and the pencils lie on the canvas, so neither is made from the other.
 * A rectangle is made from the page it lies on. It is the logo's own kind,
 * because a line of writing is the same shape in both drawings.
 *
 * @type {Drawing}
 */
export const icon = new Drawing({
  file: new URL('icon.yaml', import.meta.url),
  kinds: {
    page: { takes: Page.takes, alone: (spec) => new Page(spec) },
    pencil: { takes: Pencil.takes, alone: (spec) => new Pencil(spec) },
    rectangle: { takes: Rectangle.takes, within: (parent, spec) => parent.rectangle(spec) },
  },
})
