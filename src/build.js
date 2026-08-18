#!/usr/bin/env node

/**
 * Write dokuwiki-logo-new.svg from the design in src/.
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CANVAS, logo } from './logo.js'
import { GREEN, INK, PAPER, PAPER_BACK, RED } from './palette.js'

import { serialiseDocument } from './emit.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const elements = logo()

const svg = serialiseDocument({
  size: CANVAS,
  title: 'Red and green pencils and arrows over a stack of [[DW]] pages',
  notes: [
    'Built by build.js. Change the design in src/logo.js, not this file.',
    `palette: paper ${PAPER}, paper back ${PAPER_BACK},`,
    `red ${RED}, green ${GREEN}, ink ${INK}`,
  ],
  elements,
})

const target = join(ROOT, 'dokuwiki-logo-new.svg')
writeFileSync(target, svg)
console.log(`wrote ${target}, ${svg.length} bytes, ${elements.length} elements`)
