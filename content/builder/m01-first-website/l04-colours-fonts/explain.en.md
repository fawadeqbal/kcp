---
title: 'First CSS: colours and fonts'
summary: Use CSS to choose the colours and fonts of your page.
---

HTML says **what** is on the page. **CSS** says **how it looks**: colours, sizes, fonts and more.

CSS is written as **rules**. A rule picks some elements, then lists the styles to give them:

```css
h1 {
  color: tomato;
}
```

- `h1` is the **selector**: it picks every `h1` heading.
- `color` is a **property**: the thing you want to change.
- `tomato` is the **value**. Every line ends with a semicolon `;`.

Colours can be names like `tomato`, `navy` or `gold`, or codes like `#1e90ff`.

Two more useful properties:

```css
body {
  background-color: lightyellow;
  font-family: Georgia, serif;
}
```

- `background-color` colours the area behind your content.
- `font-family` chooses the font. After the comma goes a spare font, in case the first one isn't available.

In the editor, your CSS goes in the **CSS** tab.
