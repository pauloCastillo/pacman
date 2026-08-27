# SPEC 01 — 4 Fantasmas con Personalidades Clásicas

> **Status:** Approved
> **Depends on:** Ninguno
> **Date:** 2026-08-26
> **Objective:** Implementar 4 fantasmas con roles diferenciados (hunter, ambusher, patrol, random) que salgan del pen cada 1.5 segundos.

## Scope

**Incluido:**

- 4 fantasmas con roles: hunter, ambusher, patrol, random
- Colores clásicos de Pac-Man: rojo (#FF0000), rosa (#FFB8FF), cian (#00FFFF), naranja (#FFB852)
- Los 4 fantasmas empiezan dentro del pen
- Liberación secuencial cada 1.5 segundos (Blinky → Pinky → Inky → Clyde)
- Lógica de salida del pen (caminar hacia arriba y cruzar la puerta)

**Fuera de alcance (specs futuros):**

- Modo scatter/chase cíclico
- Modo frightened / power pellets
- Velocidad variable por nivel
- Score multiplier por fantasmas consecutivos

## Data model

```js
// Roles de fantasma
const GHOST_ROLES = {
  HUNTER: 'hunter',    // Blinky (rojo) - persigue directamente
  AMBUSHER: 'ambusher', // Pinky (rosa) - embosca N celdas delante
  PATROL: 'patrol',    // Inky (cian) - alterna entre esquinas
  RANDOM: 'random'     // Clyde (naranja) - movimiento aleatorio
};

// Colores clásicos
const GHOST_COLORS = {
  [GHOST_ROLES.HUNTER]: '#FF0000',   // Rojo
  [GHOST_ROLES.AMBUSHER]: '#FFB8FF', // Rosa
  [GHOST_ROLES.PATROL]: '#00FFFF',   // Cian
  [GHOST_ROLES.RANDOM]: '#FFB852'    // Naranja
};

// Posiciones iniciales (dentro del pen)
const GHOST_STARTS = [
  { x: 13, y: 14, role: GHOST_ROLES.HUNTER },  // Centro pen
  { x: 12, y: 14, role: GHOST_ROLES.AMBUSHER }, // Izquierda pen
  { x: 14, y: 14, role: GHOST_ROLES.PATROL },   // Derecha pen
  { x: 13, y: 14, role: GHOST_ROLES.RANDOM }    // Centro pen (stacked)
];

// Tiempos de liberación (ms)
const RELEASE_DELAYS = {
  [GHOST_ROLES.HUNTER]: 0,      // Sale primero
  [GHOST_ROLES.AMBUSHER]: 1500, // Sale después de 1.5s
  [GHOST_ROLES.PATROL]: 3000,   // Sale después de 3s
  [GHOST_ROLES.RANDOM]: 4500    // Sale después de 4.5s
};

// Estado del fantasma
const ghost = {
  x, y,
  dir,
  speed,        // 0.1 (misma velocidad para todos)
  role,         // GHOST_ROLES.HUNTER | AMBUSHER | PATROL | RANDOM
  inPen,        // true mientras esté dentro del pen
  released,     // true cuando cruza la puerta
  releaseTime,  // timestamp de liberación programada
  patrolCorner, // {x, y} esquina actual para patrol
  targetX, targetY
};
```

## Plan de implementación

1. **maze.js** — Actualizar `GHOST_STARTS` con 4 posiciones dentro del pen y renombrar `kind` a `role`.
2. **game.js: estado del fantasma** — Añadir `inPen: true`, `released: false`, `releaseTime` y `patrolCorner` a cada fantasma.
3. **game.js: timer de liberación** — En `update()`, verificar `Date.now() >= ghost.releaseTime`. Si se cumple y `!released`, activar modo escape del pen.
4. **game.js: escape del pen** — Cuando `inPen && released`, fantasma camina hacia y=12 (fuera del pen)ignorando la puerta.
5. **game.js: decideGhost()** — Añadir switch por role con lógica específica:
   - **hunter**: Minimiza Manhattan distance a Pac-Man.
   - **ambusher**: Calcula 4 celdas delante de Pac-Man en su dirección.
   - **patrol**: Alterna entre esquina `(26,0)` e `(1,30)`.
   - **random**: Elige uniformemente entre direcciones válidas.
6. **render.js** — Verificar que usa `GHOST_COLORS[ghost.role]` (ya soporta 4 colores).
7. **Verificar** — Abrir en navegador, confirmar que los 4 salen secuencialmente y se mueven diferente.

## Acceptance criteria

- [ ] Hay 4 fantasmas dentro del pen al inicio
- [ ] Blinky (rojo) sale inmediatamente del pen
- [ ] Pinky (rosa) sale a los 1.5 segundos
- [ ] Inky (cian) sale a los 3 segundos
- [ ] Clyde (naranja) sale a los 4.5 segundos
- [ ] Blinky persigue directamente a Pac-Man
- [ ] Pinky apunta 4 celdas delante de Pac-Man
- [ ] Inky alterna entre esquinas fijas del laberinto
- [ ] Clyde se mueve aleatoriamente
- [ ] Los colores son rojo, rosa, cian y naranja
- [ ] No hay errores en consola
- [ ] El juego sigue siendo jugable

## Decisiones

- **Sí:** Renombrar `kind` a `role` para mayor claridad semántica.
- **Sí:** 4 fantasmas empiezan todos dentro del pen.
- **Sí:** Liberación cada 1.5 segundos (0, 1500, 3000, 4500 ms).
- **Sí:** Patrol alterna entre esquina superior derecha (26,0) e inferior izquierda (1,30).
- **Sí:** Ambusher usa 4 celdas delante (estándar del juego original).
- **No:** Modo scatter/chase cíclico — otro spec.
- **No:** Power pellets / modo frightened — otro spec.
- **No:** Velocidad variable por fantasma — todos a 0.1.

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Fantasmas apilados en el pen | Posiciones iniciales ligeramente separadas dentro del pen |
| Patrullero puede atascarse entre esquinas | Verificar que ambas esquinas son accesibles |
| Ambusher calcula posición inválida | Usar posición actual si dirección es null |

## Qué NO está en este spec

- Modo scatter/chase cíclico
- Power pellets / modo frightened
- Velocidad variable por nivel
- Score multiplier por fantasmas consecutivos
- Fruit bonus
- Sistema de vidas extra

Cada uno de estos, si se implementa, va en su propio spec.
