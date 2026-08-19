#!/usr/bin/env node

/**
 * Write the logo files in dist/ from the design in src/.
 *
 * One file carries every level of detail and switches between them as it is
 * drawn smaller. Beside it goes a flat file per level, in attributes alone, for
 * the renderers that read no stylesheet.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CANVAS, LEVELS, logo } from './logo.js'
import { GREEN, INK, PAPER, PAPER_BACK, RED } from './palette.js'

import { round, serialiseDocument, shorten } from './emit.js'
import { stylesheet } from './responsive.js'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

/**
 * The header comment of one file: where it came from, what it holds, and how
 * to read what is in it.
 *
 * @param {string[]} about Lines saying what this file holds
 * @returns {string[]} Lines for the comment
 */
function notes(about) {
  return [
    'Built by build.js. Change the design in src/logo.js, not this file.',
    ...about,
    'An id is the initials of the name the design gives it: ars is arrow-red-shaft.',
    `palette: paper ${PAPER}, paper back ${PAPER_BACK},`,
    `red ${RED}, green ${GREEN}, ink ${INK}`,
  ]
}

/**
 * Write one file into dist and say what went into it.
 *
 * @param {string} name File name
 * @param {string} svg The file
 * @param {string} note What it holds, for the console
 * @returns {void}
 */
function write(name, svg, note) {
  writeFileSync(join(DIST, name), svg)
  console.log(`wrote dist/${name}, ${svg.length} bytes, ${note}`)
}

/**
 * What a level's own file is called.
 *
 * The files stand as a ladder to pick from by the size a drawing is wanted at,
 * so the level that holds the whole drawing is named for the largest sizes
 * rather than for its detail.
 *
 * @param {{name: string, upTo: number|null}} level A level of detail
 * @returns {string} File name
 */
function fileOf(level) {
  return `dokuwiki-logo-${level.upTo === null ? 'lg' : level.name}.svg`
}

/**
 * The sizes a level is drawn for, as its header comment says it.
 *
 * @param {{name: string, upTo: number|null}} level A level of detail
 * @returns {string} What it serves
 */
function serves(level) {
  return level.upTo === null ? 'the whole drawing' : `for ${round(level.upTo)}px and below`
}

const compositions = LEVELS.map((level) => ({ ...level, elements: shorten(logo(level.name)) }))
const whole = compositions[0]

mkdirSync(DIST, { recursive: true })

write(
  'dokuwiki-logo.svg',
  serialiseDocument({
    size: CANVAS,
    title: whole.title,
    notes: notes(['The markup is the whole drawing. The stylesheet drops detail as it is drawn smaller.']),
    style: stylesheet(compositions),
    elements: whole.elements,
  }),
  `${whole.elements.length} elements, levels ${compositions.map((level) => level.name).join(', ')}`,
)

for (const level of compositions) {
  const svg = serialiseDocument({
    size: CANVAS,
    title: level.title,
    notes: notes([
      `Level ${level.name} of the logo, ${serves(level)}, in attributes alone.`,
      'For a renderer that reads no stylesheet. dokuwiki-logo.svg carries every level.',
    ]),
    elements: level.elements,
  })
  write(fileOf(level), svg, `level ${level.name}, ${level.elements.length} elements`)
}
