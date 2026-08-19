# DokuWiki logo

`dist/dokuwiki-logo.svg` is generated, not drawn by hand. The design lives in
`src/logo.js`: what the picture is made of and where each piece goes. How a
piece looks belongs to the piece, in `src/sheet.js`, `src/arrow.js`,
`src/pencil.js` and `src/lettering.js`.

The picture is drawn at several levels of detail, so that it still reads when it
is small. The markup in the file is the whole drawing, and a stylesheet takes
detail away as the drawing gets smaller. `src/responsive.js` writes that
stylesheet by comparing each level with the one a size above it, so no rule is
written by hand. A renderer that ignores the stylesheet draws the whole logo.

`classic/dokuwiki-logo.svg` is the logo DokuWiki uses today. It is kept to
compare the new drawing against.

## Build

```
npm install
npm run build
```

That writes `dist/dokuwiki-logo.svg`, which is checked in, so a change to the
design shows up as a change to that file.

The word mark is set from `fonts/LiberationSans-Bold.ttf`, which ships with the
repository so the letters come out the same everywhere.

## Look at it

```
npm run serve
```

The server is for these two pages only: it binds to localhost and serves nothing
outside the project directory. Rebuild and reload to see a change.

<http://localhost:8731/> draws the generated file at the sizes each level of
detail serves. Every size appears three times, once for each way a level can be
reached: as its own document, pasted into a page, and told its level by a class
on the root.

<http://localhost:8731/src/serve/compare.html> puts the generated file beside
the classic one at those same sizes, on white paper and on black.
