# AGENTS.md

## Project

Vanilla JS Pac-Man clone. No build step, no npm, no bundler — open `src/index.html` in a browser.

## Structure

- `src/index.html` — entry point, loads scripts in order: `maze.js → game.js → render.js → main.js`
- `src/js/` — game logic (maze data, game state, canvas rendering, main loop)
- `src/css/style.css` — styles
- `specs/` — spec-driven development specs (if present)

## Development workflow

This project uses **spec-driven development** with two skills:

- `/spec` — design a spec before writing code
- `/spec-impl` — implement an approved spec step by step

Specs go in `specs/` as `NN-slug.md`. Use `/spec` to create them, set state to "Approved" (or "Aprobado"), then `/spec-impl` to implement.

## Conventions

- UI text is in Spanish
- No linter, formatter, or test framework configured — verify manually by opening in browser
