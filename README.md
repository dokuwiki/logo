# DokuWiki logo

`dokuwiki-logo-new.svg` is generated, not drawn by hand. The design lives in
`src/logo.js`: what the picture is made of and where each piece goes. How a
piece looks belongs to the piece, in `src/sheet.js`, `src/arrow.js`,
`src/pencil.js` and `src/lettering.js`.

The picture is drawn at several levels of detail, so that it still reads when it
is small. The markup in the file is the whole drawing, and a stylesheet takes
detail away as the drawing gets smaller. `src/responsive.js` writes that
stylesheet by comparing each level with the one a size above it, so no rule is
written by hand. A renderer that ignores the stylesheet draws the whole logo.

## Build

```
npm install
npm run build
```

That writes `dokuwiki-logo-new.svg`.

The word mark is set from `fonts/LiberationSans-Bold.ttf`, which ships with the
repository so the letters come out the same everywhere.

## Compare against the old logo

```
npm run serve
```

Then open <http://localhost:8731/>. It shows the old `dokuwiki-logo.svg` beside
the generated one, whole and zoomed in on the parts worth watching. Rebuild and
reload to see a change. The server is for this page only: it binds to localhost
and serves nothing outside the project directory.
