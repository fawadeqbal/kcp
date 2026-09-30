---
title: Links and images
summary: Link to other pages, and add pictures to yours.
---

The web is called a _web_ because its pages are linked together. A **link** uses the `a` tag. The `href` part says where the link goes:

```html
<a href="https://en.wikipedia.org/wiki/Moon">Learn about the Moon</a>
```

`href` is an **attribute**: extra information inside the opening tag, written as `name="value"`. The words between the tags are what people click.

**Images** use the `img` tag. It has no closing tag, because there's no text inside a picture:

```html
<img src="images/moon.svg" alt="A full moon in a dark sky" />
```

- `src` is the address of the picture.
- `alt` describes the picture in words. Screen readers read it aloud for people who can't see the picture, and the browser shows it if the picture doesn't load. Always write one!

In these lessons you can use our pictures: `images/beach.svg`, `images/mountains.svg`, `images/city.svg`, `images/park.svg` and `images/moon.svg`.
