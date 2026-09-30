---
title: Headings, paragraphs and lists
summary: Organise your page with headings, paragraphs of text and lists.
---

A good page is easy to read. HTML gives you tags to organise your words.

**Headings** go from `h1` (the biggest) to `h6` (the smallest). Use `h1` once, for the title of the page, and `h2` for sections.

**Paragraphs** hold normal text. Each one goes between `<p>` and `</p>`:

```html
<h1>My hobbies</h1>
<p>I like drawing and playing football.</p>
```

**Lists** show several items. `<ul>` makes a list with bullet points, and every item goes inside `<li>`:

```html
<ul>
  <li>Drawing</li>
  <li>Football</li>
  <li>Space</li>
</ul>
```

The `li` tags are _inside_ the `ul` tag. Tags inside other tags are called **nested** tags. Moving them a little to the side, called **indenting**, makes your code easier to read.

Want numbers instead of bullet points? Use `<ol>` instead of `<ul>`.
