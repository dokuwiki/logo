#!/usr/bin/env node

/**
 * Write the logo files in dist/ from the design in src/.
 *
 * One file carries every level of detail and switches between them as it is
 * drawn smaller. Beside it go a flat file per level, a PNG per size, and an
 * icon.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pngToIco from 'png-to-ico'
import { Resvg } from '@resvg/resvg-js'

import { CANVAS, LEVELS, logo } from './logo.js'
import { GREEN, INK, PAPER, PAPER_BACK, RED } from './palette.js'

import { round, serialiseDocument, shorten } from './emit.js'
import { stylesheet } from './responsive.js'

/**
 * Where the built files go.
 *
 * @type {string}
 */
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

/**
 * The sizes a PNG is written at, largest first.
 *
 * The levels were designed against these sizes, which the compare page draws.
 *
 * @type {number[]}
 */
const SIZES = [256, 128, 96, 64, 48, 40, 32, 24, 20, 16]

/**
 * The sizes favicon.ico carries, smallest first: what a browser picks between
 * for a tab, a bookmark and a shortcut.
 *
 * Each has to be a size a PNG is drawn at, because the icon is packed from
 * those.
 *
 * @type {number[]}
 */
const ICON = [16, 32, 48]

/**
 * The header comment of one file.
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
 * @param {string|Buffer} body The file
 * @param {string} note What it holds, for the console
 * @returns {void}
 */
function write(name, body, note) {
  writeFileSync(join(DIST, name), body)
  console.log(`wrote dist/${name}, ${body.length} bytes, ${note}`)
}

/**
 * What a level's own file is called.
 *
 * The files are picked from by the size a drawing is wanted at, so the level
 * that holds the whole drawing is named lg.
 *
 * @param {{name: string, upTo: number|null}} level A level of detail
 * @returns {string} File name
 */
function fileOf(level) {
  return `dokuwiki-logo-${level.upTo === null ? 'lg' : level.name}.svg`
}

/**
 * The level a size is drawn at: the smallest one that still answers at that
 * size, which is the level the responsive file switches to there.
 *
 * @param {Array<{upTo: number|null}>} levels The levels, largest first
 * @param {number} size Edge length in pixels
 * @returns {object} The level to draw
 */
function levelAt(levels, size) {
  return levels.filter((level) => level.upTo === null || size <= level.upTo).at(-1)
}

/**
 * Draw one level at one size.
 *
 * The word mark is outlines rather than text, so no font has to be found.
 *
 * @param {string} svg A level's flat file
 * @param {number} size Edge length in pixels
 * @returns {Buffer} A PNG
 */
function raster(svg, size) {
  const drawing = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
  return drawing.render().asPng()
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

const flat = new Map()
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
  flat.set(level, svg)
  write(fileOf(level), svg, `level ${level.name}, ${level.elements.length} elements`)
}

const pngs = new Map()
for (const size of SIZES) {
  const level = levelAt(compositions, size)
  pngs.set(size, raster(flat.get(level), size))
  write(`dokuwiki-logo-${size}.png`, pngs.get(size), `level ${level.name} at ${size}px`)
}

write('favicon.ico', await pngToIco(ICON.map((size) => pngs.get(size))), `${ICON.join(', ')}px`)
