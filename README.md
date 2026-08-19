# DokuWiki logo

`dist/dokuwiki-logo.svg` is generated, not drawn by hand. The design lives in
`src/logo.yaml`: the colours, what the picture is made of, where each piece
goes, and what each level of detail changes about it. How a piece looks belongs
to the piece, one class per kind under `src/parts/`, named for the kind the
design asks for by name. `src/logo.js` reads the design and makes the pieces.

Each piece says what it is and what it is placed in. `is` picks the kind that
draws it, one of a sheet, a pencil, an arrow or a word mark, and `in` names the
frame it hangs in, either the canvas or another piece it then follows.

Beyond that every piece is said the same way, so four edits look the same
wherever they are made: `at` moves a piece, `size` makes it larger or smaller,
`stroke.width` sets how heavy its outline is, and `show` hides or shows it. A
level of detail says only what it changes, so saying a value there wins and
leaving one out never puts it back.

A point is written either way. `x` and `y` are a distance across the frame and
down it, in the frame's own measure; `u` and `v` are those same two as fractions
of the frame's width and height. Both mean the same place, but a fraction still
means it when the frame is cut to another size, which is how the word mark stays
centred on the paper where a smaller level cuts the paper larger.

The picture is drawn at several levels of detail, so that it still reads when it
is small. The markup in the file is the whole drawing, and a stylesheet takes
detail away as the drawing gets smaller. `src/responsive.js` writes that
stylesheet by comparing each level with the one a size above it, so no rule is
written by hand. A renderer that ignores the stylesheet draws the whole logo.

Beside it goes a flat file per level, `dist/dokuwiki-logo-lg.svg`, `-md.svg`,
`-sm.svg` and `-xs.svg`, each named for the size it is wanted at. Each one is a
level already drawn as it comes out, in attributes alone, with no stylesheet and
nothing hidden. They carry every consumer that is not a browser, because
librsvg, Inkscape and the tools built on them read no queries.

A PNG goes with each size the compare page draws, `dist/dokuwiki-logo-256.png`
down to `-16.png`, rasterised from the level that serves that size, on a clear
background. `dist/favicon.ico` holds the 16, 32 and 48 pixel drawings in the one
file a browser asks for by that name. `@resvg/resvg-js` draws the pixels and
`png-to-ico` packs the icon.

`classic/dokuwiki-logo.svg` is the logo DokuWiki uses today. It is kept to
compare the new drawing against.

## Build

```
npm install
npm run build
```

That writes every file in `dist/`, all of which are checked in, so a change to
the design shows up as a change to them.

The word mark is set from `fonts/LiberationSans-Bold.ttf`, which ships with the
repository so the letters come out the same everywhere.

## Look at it

```
npm run serve
```

The server is for these three pages only: it binds to localhost and serves
nothing outside the project directory. Rebuild and reload to see a change. Each
page wears `dist/favicon.ico`, so a tab shows the logo the page is about.

<http://localhost:8731/> draws the generated file at the sizes each level of
detail serves. Every size appears three times, once for each way a level can be
reached: as its own document, pasted into a page, and told its level by a class
on the root.

<http://localhost:8731/src/serve/compare.html> puts the generated file beside
the classic one at those same sizes, on white paper and on black.

<http://localhost:8731/src/serve/closeup.html> draws the whole file at 1024
pixels, once for each level of detail, one under another. A level is held at that
size by its class, which is the only mechanism that can hold a level at a size it
does not answer to.
