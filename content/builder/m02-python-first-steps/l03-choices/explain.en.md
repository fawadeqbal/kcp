---
title: Making choices with if
summary: Programs can decide what to do with if, elif and else.
---

Programs make choices all the time: did you win the game? Is the password right? In Python, choices start with `if`:

```python
guess = int(input("Guess my number: "))
if guess == 7:
    print("You got it!")
else:
    print("Try again!")
```

- `if` checks a **condition**. If it's true, Python runs the lines under it.
- `else` runs when the condition is false.
- Don't forget the colon `:` at the end of the `if` and `else` lines.
- The lines inside move in by **4 spaces**. That's how Python knows which lines belong to the `if`.

Conditions compare values:

- `a == b`: a is equal to b (two `=` signs!)
- `a != b`: a is not equal to b
- `a > b`: a is bigger than b
- `a < b`: a is smaller than b
- `a >= b`: a is bigger than or equal to b

For more than two choices, add `elif` ("else if"). Python checks them from the top and runs only the first one that is true:

```python
score = int(input("Your score: "))
if score >= 90:
    print("Amazing!")
elif score >= 50:
    print("Well done!")
else:
    print("Keep practising!")
```
