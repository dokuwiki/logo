# DokuWiki logo

`dokuwiki-logo-new.svg` is generated, not drawn by hand. The design lives in
`src/logo.js`: what the picture is made of and where each piece goes. How a
piece looks belongs to the piece, in `src/sheet.js`, `src/arrow.js`,
`src/pencil.js` and `src/lettering.js`.

## Build

```
npm install
npm run build
```

That writes `dokuwiki-logo-new.svg`.

The word mark is set from `fonts/LiberationSans-Bold.ttf`, which ships with the
repository so the letters come out the same everywhere.
