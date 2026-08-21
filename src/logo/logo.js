/**
 * The logo: its design file and the kinds of part it is drawn from.
 */

import { Drawing } from '../drawing.js'
import { Pencil } from './pencil.js'
import { Sheet } from './sheet.js'

/**
 * The logo, as logo.yaml composes it.
 *
 * An arrow and a word mark are made from the sheet they lie on, so they follow
 * it wherever it goes.
 *
 * @type {Drawing}
 */
export const logo = new Drawing({
  file: new URL('logo.yaml', import.meta.url),
  kinds: {
    sheet: { alone: (spec) => new Sheet(spec), within: (parent, spec) => parent.behind(spec) },
    pencil: { alone: (spec) => new Pencil(spec) },
    arrow: { within: (parent, spec) => parent.arrow(spec) },
    wordmark: { within: (parent, spec) => parent.write(spec) },
  },
})
