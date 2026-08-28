# SPEC 02 — Salida de fantasmas del pen

> **Status:** Draft
> **Depends on:** SPEC 01
> **Date:** 2026-08-27
> **Objective:** Corregir la salida de los fantasmas del pen para que al liberarse crucen la puerta y queden en el mapa transitando.

## Scope

**In:**

- Fix de `moveGhost` en `src/js/game.js` para que fantasmas en `inPen` salgan caminando hacia `y=12` (puerta `3` en `src/js/maze.js:12`) y queden en `y=11` fuera del pen.
- Centrado determinista en `x=13` antes de subir si `x` es `12` o `14`.
- Activación de `released` por `RELEASE_DELAYS` en `update()` y `resetPositions()` unificada.
- Verificación de `isWall`/`canMove` que fantasmas crucen puerta `3` pero respeten muros `1`.

**Out of scope (para futuros specs):**

- Cambios a `MAZE_STR` o `GHOST_STARTS` posiciones iniciales.
- Cambios a roles/personalidades (`hunter/ambusher/patrol/random`) o velocidades.
- Modo scatter/chase cíclico, frightened/power pellets.
- Rediseño de render o colisiones.

## Data model

Esta feature no introduce estructuras nuevas. Reutiliza el modelo de SPEC 01 (`src/js/maze.js:55-81`, `src/js/game.js:39-51`):

```js
const ghost = {
  x, y,
  dir,
  speed,
  role,         // hunter | ambusher | patrol | random
  inPen,        // true dentro del pen
  released,     // true cuando toca salir
  releaseTime,  // Date.now() + RELEASE_DELAYS[role]
  patrolCorner,
};
```

Puerta pen: `MAZE[12][13] === 3` y `MAZE[12][14] === 3` (`src/js/maze.js:12`).

## Implementation plan

1. Reproducir bug abriendo `src/index.html` y observando que ghosts no llegan a `y<=11` tras su delay.
2. Fix `moveGhost` en `src/js/game.js:169-198`: si `inPen && released && aligned`, centrar en `x=13` si `x<13` → `right`, `x>14` → `left`, luego `up`; al cruzar `y<=12` poner `y=11, x=13, inPen=false` y `decideGhost` en mismo frame; guardia si `canMove` falla no dejar atrapado.
3. Unificar `tryRelease` para `update()` (`src/js/game.js:238-242`) y `resetPositions()` (`src/js/game.js:213-232`) — mismo `releaseTime = now + RELEASE_DELAYS[role]`.
4. Verificar `isWall`/`canMove` (`src/js/game.js:61-79`) deja pasar `3` a ghost y bloquea `1` a ambos.
5. Verificación manual: abrir en navegador, 4 salen secuenciales y quedan transitando en mapa sin errores.

## Acceptance criteria

- [ ] 4 fantasmas inician en pen en `GHOST_STARTS` (`src/js/maze.js:69-74`)
- [ ] Blinky sale inmediato (0ms), Pinky 1.5s, Inky 3s, Clyde 4.5s y ninguno queda en `y>=13` tras delay+~1s
- [ ] Tras salir `g.inPen===false` y `g.y<=11` (fuera de puerta) y se mueve según su rol
- [ ] `resetPositions` tras perder vida reactiva timers y repite salida igual
- [ ] No atraviesan muros `1`, sí cruzan puerta `3`
- [ ] No hay errores en consola, juego jugable

## Decisions

- **Sí:** Solo tocar `src/js/game.js`, no `maze.js` — geometría del pen es correcta (`maze.js:12-16`).
- **Sí:** Salida caminando suave centrada en `x=13`, al cruzar saltar directo a `y=11` — evita quedarse 1 frame en puerta eligiendo dirección bloqueada.
- **Sí:** Centrado determinista `x<13 right / x>14 left / else up` — evita rebote lateral.
- **Sí:** Unificar `releaseTime` en helper usado por `update` y `resetPositions` — evita desync.
- **No:** Teleport instantáneo — se pierde animación de salida.
- **No:** Cambiar `GHOST_STARTS` stack en `13,14` — intencional SPEC 01, otro spec si molesta.
- **No:** Ignorar muros del pen — solo puerta `3` es transitable para ghost.

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Ghost en `x=12` choca lateral | Centrado forzado a `13` antes de subir |
| Quedarse en `y=12` elige dirección bloqueada | Saltar directo a `y=11` + `decideGhost` mismo frame |
| `Date.now()` desync tras reset | `releaseTime = now + RELEASE_DELAYS[role]` en ambos sitios |
| Stack inicial parece bug | Documentado como fuera de scope |

## What is **not** in this spec

- Cambios a personalidades, velocidades, scatter/chase, frightened/power pellets
- Rediseño de `MAZE_STR` o posiciones iniciales
- Nuevo pathfinding o sistema de colisiones
- Cambios visuales en `render.js`

Cada uno de esos, si se implementa, va en su propio spec.
