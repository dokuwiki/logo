# Fonts

`Nunito-ExtraBold.ttf` is what the word mark is set in, copied here so the build
draws the same letters on any machine. Nunito carries the rounded terminals the
rest of the drawing is drawn with.

It is licensed under the SIL Open Font License 1.1, in `LICENSE`. That licence
reserves no name, so this file may carry Nunito's, and the copyright notice and
the licence travel inside the file's own name table.

Upstream Nunito is one variable font covering every weight. This file is the one
weight the mark uses, cut down to Latin, made from
[google/fonts](https://github.com/google/fonts/tree/main/ofl/nunito) with:

```
fonttools varLib.instancer 'Nunito[wght].ttf' wght=800 --update-name-table -o instance.ttf
fonttools subset instance.ttf --unicodes=U+0020-00FF --layout-features=kern \
  --name-IDs='*' --output-file=Nunito-ExtraBold.ttf
```

Both steps are needed. opentype.js sets the text, and it cannot read the variable
font or a full instance of it: Nunito's `ccmp` feature uses a lookup form it
cannot parse, and it applies that feature whatever it is asked for. The
subsetting keeps kerning and drops the rest, which leaves a file it can read. Run
the two commands again to replace this file rather than editing it.
