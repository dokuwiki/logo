/**
 * Reading a placement file and compositing the graphic it says.
 *
 * A graphic is not a drawing. It is a stack of finished pictures laid on a
 * canvas, back to front, each at a point on it: a piece of template art beside
 * the placement file, or a file this build has already written. Nothing is
 * composed here, so nothing here knows what a part or a level of detail is, and
 * a graphic can only be as right as the file it names.
 *
 * A layer covers what is under it, unless it says otherwise: how much of its ink
 * is laid down, how far it fades, and how it blends with what is under it. The
 * logo on the paper photograph is printed pale and multiplied into it, so that
 * the sheet's creases darken the logo along with the paper.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { parse } from 'yaml'

/**
 * What a placement file can say.
 *
 * @type {string[]}
 */
const SAID = ['title', 'where', 'file', 'size', 'ground', 'layers']

/**
 * What one layer can be given.
 *
 * @type {string[]}
 */
const GIVEN = ['id', 'file', 'at', 'size', 'ink', 'opacity', 'blend']

/**
 * How a graphic is written, by the ending its file name carries.
 *
 * The quality a JPEG is written at is the one the paper photo survives: the
 * creases stay clean and the file stays a tenth of what the same picture costs
 * as a PNG.
 *
 * @type {Object<string, function(sharp.Sharp): sharp.Sharp>}
 */
const ENCODERS = {
  '.png': (image) => image.png(),
  '.jpg': (image) => image.jpeg({ quality: 88 }),
}

/**
 * A file by the name it is called.
 *
 * @param {URL} file The file
 * @returns {string} Its name
 */
function named(file) {
  return decodeURIComponent(file.pathname).split('/').at(-1)
}

/**
 * Check that a description says only what it can say.
 *
 * @param {Object} spec What was written
 * @param {string[]} keys What it can say
 * @param {string} where Which description this is, for the message
 * @returns {void}
 * @throws {Error} If it says something else
 */
function only(spec, keys, where) {
  for (const key of Object.keys(spec)) {
    if (!keys.includes(key)) throw new Error(`${where} says ${key}, which is nothing it says`)
  }
}

/**
 * The file one layer names, wherever it is.
 *
 * A name is looked for beside the placement file, where the graphic's own
 * template art lives, and then among the files this build has already written.
 * The two places hold different kinds of file and no name is in both.
 *
 * @param {string} name What the layer names
 * @param {URL} file The placement file
 * @param {string} dist Where the built files are
 * @param {string} where Which layer, for the message
 * @returns {URL} The file
 * @throws {Error} If it is in neither place
 */
function source(name, file, dist, where) {
  const beside = new URL(name, file)
  if (existsSync(beside)) return beside

  const built = pathToFileURL(join(dist, name))
  if (existsSync(built)) return built

  throw new Error(`${where} names ${name}, which is neither beside ${named(file)} nor a file the build wrote`)
}

/**
 * Draw one SVG at the size it is given.
 *
 * The build draws every SVG it makes pixels of with resvg, this one included, so
 * that the same drawing cannot come out two ways. A drawing is scaled to the
 * width it is given and only resampled where the height asked for is not the one
 * that follows, which a square drawing in a square layer never is.
 *
 * @param {string} svg The drawing
 * @param {{w: number, h: number}} size How big it is drawn
 * @returns {Promise<Buffer>} It as pixels
 */
async function rasterised(svg, size) {
  const drawn = new Resvg(svg, { fitTo: { mode: 'width', value: size.w }, font: { loadSystemFonts: false } })
  const png = drawn.render()
  if (png.height === size.h) return png.asPng()
  return sharp(png.asPng()).resize(size.w, size.h, { fit: 'fill' }).png().toBuffer()
}

/**
 * One layer with less of its ink laid down.
 *
 * Every colour is moved that far toward white, which is what a fainter print of
 * something is. A layer multiplied into a photograph is made fainter this way
 * and no other: laying the same layer down at a lower opacity darkens it
 * instead, because what a multiply makes of a part-transparent layer is not a
 * paler version of it.
 *
 * @param {Buffer} body The layer as pixels
 * @param {number} ink How much of its ink is laid down, from 0 to 1
 * @returns {Promise<Buffer>} The same layer, paler
 */
function paler(body, ink) {
  return sharp(body)
    .linear(ink, 255 * (1 - ink))
    .png()
    .toBuffer()
}

/**
 * One layer with its alpha multiplied, so that it is laid down faded.
 *
 * Opacity is not something a layer is composited with: sharp lays a layer down
 * at the alpha the layer itself carries. So the alpha is multiplied here first,
 * by covering the layer with one translucent pixel tiled over it and keeping
 * only what both of them cover.
 *
 * @param {Buffer} body The layer as pixels
 * @param {number} opacity How much of it to keep, from 0 to 1
 * @returns {Promise<Buffer>} The same layer, faded
 */
function faded(body, opacity) {
  const veil = { create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: opacity } } }
  return sharp(body)
    .ensureAlpha()
    .composite([{ input: veil, tile: true, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/**
 * One layer as pixels, at the size it is drawn and however pale.
 *
 * A drawing has to be given a size, because it has no size of its own to fall
 * back on. A picture is drawn at its own size unless it is given one.
 *
 * @param {Object} layer One layer, as the placement file says it
 * @param {URL} file The placement file
 * @param {string} dist Where the built files are
 * @returns {Promise<{body: Buffer, size: {w: number, h: number}}>} The layer and
 *   how much room it takes
 * @throws {Error} If it names a file that is not there, or a drawing with no
 *   size
 */
async function drawn(layer, file, dist) {
  const where = `layer ${layer.id}`
  const from = source(layer.file, file, dist, where)

  let body
  let size = layer.size
  if (layer.file.endsWith('.svg')) {
    if (!size) throw new Error(`${where} is a drawing, which is drawn at the size it is given, and it has none`)
    body = await rasterised(readFileSync(from, 'utf8'), size)
  } else {
    const picture = sharp(readFileSync(from))
    const drawing = size ? picture.resize(size.w, size.h, { fit: 'fill' }) : picture
    const { data, info } = await drawing.png().toBuffer({ resolveWithObject: true })
    body = data
    size = { w: info.width, h: info.height }
  }

  if (layer.ink !== undefined) body = await paler(body, layer.ink)
  if (layer.opacity !== undefined) body = await faded(body, layer.opacity)

  return { body, size }
}

/**
 * Check that a layer lands on the canvas rather than over its edge.
 *
 * A graphic is the size it says, so a layer that does not fit is a placement to
 * correct and not a picture to crop.
 *
 * @param {Object} layer One layer, as the placement file says it
 * @param {{w: number, h: number}} drawn How much room it takes
 * @param {{w: number, h: number}} canvas How big the graphic is
 * @returns {void}
 * @throws {Error} If any of it falls outside the canvas
 */
function fits(layer, drawn, canvas) {
  const over = layer.at.x < 0 || layer.at.y < 0
  const past = layer.at.x + drawn.w > canvas.w || layer.at.y + drawn.h > canvas.h
  if (!over && !past) return
  throw new Error(
    `layer ${layer.id} is ${drawn.w} by ${drawn.h} at ${layer.at.x}, ${layer.at.y}, which falls off a ` +
      `${canvas.w} by ${canvas.h} canvas`,
  )
}

/**
 * Composite one graphic.
 *
 * @param {URL} file The placement file
 * @param {string} dist Where the files this build has already written are
 * @returns {Promise<{file: string, body: Buffer, note: string}>} What to write
 *   it as, the graphic itself, and what went into it
 * @throws {Error} If the placement file says something it does not say, is
 *   written as a file type nothing here writes, or holds a layer that cannot be
 *   drawn or does not fit
 */
export async function graphic(file, dist) {
  const spec = parse(readFileSync(file, 'utf8'))
  only(spec, SAID, named(file))

  const ending = spec.file.slice(spec.file.lastIndexOf('.'))
  const encode = ENCODERS[ending]
  if (!encode) {
    throw new Error(`${spec.file} is a ${ending}, and a graphic is written ${Object.keys(ENCODERS).join(' or ')}`)
  }

  const laid = []
  for (const layer of spec.layers) {
    only(layer, GIVEN, `layer ${layer.id}`)
    const { body, size } = await drawn(layer, file, dist)
    fits(layer, size, spec.size)
    laid.push({ input: body, left: layer.at.x, top: layer.at.y, ...(layer.blend ? { blend: layer.blend } : {}) })
  }

  const canvas = {
    create: {
      width: spec.size.w,
      height: spec.size.h,
      channels: 4,
      background: spec.ground ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }

  return {
    file: spec.file,
    body: await encode(sharp(canvas).composite(laid)).toBuffer(),
    note: `${spec.title}, ${spec.size.w} by ${spec.size.h}, ${laid.length} layers, for ${spec.where}`,
  }
}
