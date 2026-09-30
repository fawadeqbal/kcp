---
title: 'Project: a text adventure'
summary: Write a story game where the player's choices change the ending.
hints:
  two_inputs: 'Use input( ) at least twice: once for the name, once for a choice.'
  use_name: "Keep the player's name in a variable and print it in your story."
  story: 'Tell your story with at least three print( ) lines.'
  use_if: 'Use if and else (and elif if you like) to react to the choice.'
  endings: 'Different choices need different endings: print something different for "left" and "right".'
---

Time to make a game! A **text adventure** is a story where the player decides what happens. Your program tells the story, asks the player what to do, and each choice leads to a different ending.

## Your game needs

1. A welcome, and a question that asks for the player's **name** with `input()`.
2. A story told with at least **three** `print()` lines, that uses the player's name.
3. A **choice** the player makes with `input()`, like "left" or "right".
4. `if`, `elif` and `else`, so that **different choices give different endings**.

The checker plays your game twice: once answering "left" and once answering "right". Make sure those two give different endings!

## Ideas

- A cave with a dragon, a spaceship with a broken engine, a jungle full of monkeys…
- Add a second choice inside one of the endings.
- Use `.lower()` on the answer, so "LEFT" and "Left" work too: `choice = input("Left or right? ").lower()`

Test your game with the **Answers for input()** box: one answer per line. When every requirement is ticked, press **Ship it** to add it to your portfolio.
