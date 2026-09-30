---
title: Variables and input
summary: Keep things in variables, and let your program ask questions with input().
---

A **variable** is a name for a value, like a labelled box. You make one with `=`:

```python
nickname = "Rocket"
score = 10
print(nickname)
print(score + 5)
```

The name goes on the left, the value on the right. After that, the name stands for the value. Names use letters, numbers and `_`, and can't have spaces: `favourite_food` works, `favourite food` doesn't.

You can join strings together with `+`:

```python
print("Hello, " + nickname + "!")
```

### Asking questions

`input()` lets your program ask a question and wait for an answer. The answer is a string you can keep in a variable:

```python
name = input("What's your name? ")
print("Nice to meet you, " + name + "!")
```

Here, type your answers in the **Answers for input()** box under the editor, one answer per line, then press **Run**.

`input()` always gives you text. To use the answer as a number, wrap it in `int()`:

```python
age = int(input("How old are you? "))
print("Next year you'll be", age + 1)
```
