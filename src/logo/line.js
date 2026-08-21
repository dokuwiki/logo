/**
 * The line art: its design file and the kinds of part it is drawn from.
 */

import { Drawing } from '../drawing.js'
import { kinds } from './logo.js'

/**
 * The logo as line art, as line.yaml paints it.
 *
 * It takes the logo's own parts where the logo puts them.
 *
 * @type {Drawing}
 */
export const line = new Drawing({ file: new URL('line.yaml', import.meta.url), kinds })
