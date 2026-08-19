#!/usr/bin/env node

/**
 * Write dokuwiki-logo-new.svg from the design in src/.
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CANVAS, LEVELS, logo } from './logo.js'
import { GREEN, INK, PAPER, PAPER_BACK, RED } from './palette.js'

import { serialiseDocument, shorten } from './emit.js'
import { stylesheet } from './responsive.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const compositions = LEVELS.map((level) => ({ ...level, elements: shorten(logo(level.name)) }))
const elements = compositions[0].elements

const svg = serialiseDocument({
  size: CANVAS,
  title: 'Red and green pencils and arrows over a stack of [[DW]] pages',
  notes: [
    'Built by build.js. Change the design in src/logo.js, not this file.',
    'The markup is the whole drawing. The stylesheet drops detail as it is drawn smaller.',
    'An id is the initials of the name the design gives it: ars is arrow-red-shaft.',
    `palette: paper ${PAPER}, paper back ${PAPER_BACK},`,
    `red ${RED}, green ${GREEN}, ink ${INK}`,
  ],
  style: stylesheet(compositions),
  elements,
})

const target = join(ROOT, 'dokuwiki-logo-new.svg')
writeFileSync(target, svg)
const levels = compositions.map((level) => level.name).join(', ')
console.log(`wrote ${target}, ${svg.length} bytes, ${elements.length} elements, levels ${levels}`)
