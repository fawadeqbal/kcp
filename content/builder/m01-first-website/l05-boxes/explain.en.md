---
title: 'Boxes: margin, padding and borders'
summary: Every element is a box. Add space and borders to make neat cards.
---

To the browser, every element on a page is a **box**. You can change the space inside it, its edge, and the space around it:

- **padding** is the space _inside_ the box, between the content and the edge.
- **border** is the edge of the box.
- **margin** is the space _outside_ the box, between it and its neighbours.

```css
.card {
  padding: 16px;
  border: 2px solid navy;
  margin-bottom: 12px;
}
```

`px` means pixels: the tiny dots on your screen. A `border` needs three things: how thick it is, its style (`solid`, `dashed` or `dotted`) and its colour.

See the dot in `.card`? It picks elements by their **class**. In HTML, you give an element a class like this:

```html
<div class="card">
  <h2>Football</h2>
  <p>I play every Friday.</p>
</div>
```

A `div` is a box with no special meaning, which makes it perfect for grouping things. Every element with `class="card"` gets the `.card` styles.

Bonus: add `border-radius: 12px;` for round corners!
