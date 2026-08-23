#!/usr/bin/env node

/**
 * Write the files of every design in dist/.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pngToIco from 'png-to-ico'
import sharp from 'sharp'
import { Resvg } from '@resvg/resvg-js'

import { icon } from './icon/icon.js'
import { line } from './logo/line.js'
import { logo } from './logo/logo.js'

import { graphic } from './graphics/graphics.js'
import { serialiseDocument, shorten } from './emit.js'
import { stylesheet, variantAt } from './responsive.js'
import { flatten } from './flatten.js'

/**
 * Where the built files go.
 *
 * @type {string}
 */
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

/**
 * Where the graphics go, under dist.
 *
 * They sit apart from the logo files.
 *
 * @type {string}
 */
const GRAPHICS_DIR = 'graphics'

/**
 * The sizes a PNG is written at, largest first.
 *
 * The logo's levels were designed against these sizes.
 *
 * @type {number[]}
 */
const SIZES = [256, 128, 96, 64, 48, 40, 32, 24, 20, 16]

/**
 * The sizes favicon.ico carries, smallest first.
 *
 * Each must be a size a PNG is drawn at, because the icon is packed from those.
 *
 * @type {number[]}
 */
const FAVICON = [16, 32, 48]

/**
 * The apple touch icon's tile, at the width iOS asks for.
 *
 * @type {{size: number, margin: number, ground: string}}
 */
const TOUCH = { size: 180, margin: 10, ground: '#ffffff' }

/**
 * The designs the build writes, and what each one is written as.
 *
 * Whether a variant is cut into one path is a fact about the files rather than
 * the drawing, so it is set here.
 *
 * @type {Array<{drawing: import('./drawing.js').Drawing, stem: string,
 *   sizes?: number[], favicon?: number[],
 *   touch?: {size: number, margin: number, ground: string}, cut?: boolean}>}
 */
const DRAWINGS = [
  { drawing: logo, stem: 'dokuwiki-logo', sizes: SIZES, favicon: FAVICON, touch: TOUCH },
  { drawing: icon, stem: 'dokuwiki-icon', cut: true },
  { drawing: line, stem: 'dokuwiki-logo-line', cut: true },
]

/**
 * The graphics the build composites, each named by its placement file.
 *
 * @type {string[]}
 */
const GRAPHICS = ['button.yaml', 'forum.yaml', 'translate.yaml', 'patreon.yaml']

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
 * Draw one variant at one size.
 *
 * The word mark is outlines rather than text, so no font is loaded.
 *
 * @param {string} svg A variant's flat file
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
 * Lay one variant on an opaque tile, inside a margin.
 *
 * The variant is drawn at the room the margin leaves it, so nothing is
 * resampled. The tile carries no alpha channel, because the ground covers every
 * pixel.
 *
 * @param {string} svg A variant's flat file
 * @param {{size: number, margin: number, ground: string}} tile The tile, as
 *   TOUCH says it
 * @returns {Promise<Buffer>} A PNG
 */
function tiled(svg, { size, margin, ground }) {
  const canvas = { create: { width: size, height: size, channels: 4, background: ground } }
  const drawing = { input: raster(svg, size - 2 * margin), left: margin, top: margin }
  return sharp(canvas).composite([drawing]).removeAlpha().png().toBuffer()
}

/**
 * The elements one variant is written with.
 *
 * A drawing cut into one path becomes a single element. Otherwise its ids are
 * shortened to initials where a stylesheet is written, because a stylesheet
 * repeats each id many times.
 *
 * @param {import('./drawing.js').Drawing} drawing The drawing
 * @param {string} variant Which variant
 * @param {boolean} [cut] Whether its elements become one path
 * @returns {Array<{tag: string, attrs: Object}>} The elements
 */
function written(drawing, variant, cut) {
  const elements = drawing.elements(variant)
  if (cut) return flatten(elements, drawing.ground)
  return drawing.bySize ? shorten(elements) : elements
}

/**
 * What one variant's flat file is called.
 *
 * A drawing with one variant drops the variant name from its file.
 *
 * @param {string} stem What the drawing's files are called
 * @param {string} variant Which variant
 * @param {number} of How many variants the drawing has
 * @returns {string} The file name
 */
function flatName(stem, variant, of) {
  return of === 1 ? `${stem}.svg` : `${stem}-${variant}.svg`
}

/**
 * Write every file one design comes to.
 *
 * Every drawing gets a flat file per variant. A drawing whose variants are
 * levels of detail also gets the one file that carries them all.
 *
 * @param {object} entry One design, as DRAWINGS says it
 * @param {import('./drawing.js').Drawing} entry.drawing The drawing
 * @param {string} entry.stem What its files are called
 * @param {number[]} [entry.sizes] The sizes to write a PNG at, largest first
 * @param {number[]} [entry.favicon] The sizes favicon.ico carries
 * @param {{size: number, margin: number, ground: string}} [entry.touch] The
 *   apple touch icon's tile
 * @param {boolean} [entry.cut] Whether each variant becomes one path, its
 *   ground cut out of its ink
 * @returns {Promise<void>}
 */
async function writeDrawing({ drawing, stem, sizes, favicon, touch, cut }) {
  const document = { size: drawing.canvas, title: drawing.title }
  const compositions = []
  for (const variant of drawing.variants) {
    compositions.push({ ...variant, elements: written(drawing, variant.name, cut) })
  }

  if (drawing.bySize) {
    const whole = compositions[0]
    write(
      `${stem}.svg`,
      serialiseDocument({ ...document, style: stylesheet(compositions), elements: whole.elements }),
      `${whole.elements.length} elements, variants ${compositions.map((variant) => variant.name).join(', ')}`,
    )
  }

  const flat = new Map()
  for (const variant of compositions) {
    const svg = serialiseDocument({ ...document, elements: variant.elements })
    flat.set(variant, svg)
    write(
      flatName(stem, variant.name, compositions.length),
      svg,
      `variant ${variant.name}, ${variant.elements.length} elements`,
    )
  }

  if (touch) {
    const room = touch.size - 2 * touch.margin
    const variant = variantAt(compositions, room)
    write(
      'apple-touch-icon.png',
      await tiled(flat.get(variant), touch),
      `variant ${variant.name} at ${room}px on a ${touch.size}px ${touch.ground} tile`,
    )
  }

  if (!sizes) return

  const pngs = new Map()
  for (const size of sizes) {
    const variant = variantAt(compositions, size)
    pngs.set(size, raster(flat.get(variant), size))
    write(`${stem}-${size}.png`, pngs.get(size), `variant ${variant.name} at ${size}px`)
  }

  if (favicon) {
    write('favicon.ico', await pngToIco(favicon.map((size) => pngs.get(size))), `${favicon.join(', ')}px`)
  }
}

// making the graphics directory makes dist as well
mkdirSync(join(DIST, GRAPHICS_DIR), { recursive: true })
for (const entry of DRAWINGS) await writeDrawing(entry)

for (const name of GRAPHICS) {
  const made = await graphic(new URL(`graphics/${name}`, import.meta.url), DIST)
  write(join(GRAPHICS_DIR, made.file), made.body, made.note)
}
