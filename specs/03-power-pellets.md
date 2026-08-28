# SPEC 03 — Power Pellets en esquinas con modo frightened y respawn

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-27
> **Objective:** Colocar 4 power pellets en las esquinas jugables que al ser comidos activan 7s de modo frightened para comer fantasmas y reaparecen 10s después de ser consumidos.

## Scope

**In:**

- 4 power pellets en `POWER_CORNERS = [(1,3),(26,3),(1,23),(26,23)]` (`src/js/maze.js`), valor `4` en `grid`, render grande parpadeante
- Consumo por Pac-Man: `+50` puntos, activa `game.frightenedUntil = Date.now()+7000` (si ya activo, reinicia timer)
- Modo frightened 7s: fantasmas fuera del pen se vuelven vulnerables — color azul `#2121ff` (parpadeo `#ffffff` últimos 2s), velocidad `0.05`, huyen (`random` + inversión de `dir`), Pac-Man los come si colisiona
- Fantasma comido en frightened: `+200` fijos (sin multiplier), va directo al pen `x=13,y=14, inPen=true, released=false, releaseTime=now+1500, dir=up` (1.5s), y retoma su rol al salir
- Respawn: cada pellet guarda `respawnAt`; en `update()` si `now>=respawnAt` y `grid[y][x]===0` restaura `grid[y][x]=4` (respawn incondicional — si Pac-Man está encima lo come al siguiente frame)
- Integración con `movePacman`, `moveGhost`, `decideGhost`, `update`, `resetPositions`, `draw`

**Out of scope (para futuros specs):**

- Score multiplier 200/400/800/1600 por racha en mismo power
- Fruta/bonus, vidas extra, niveles
- Scatter/chase cíclico, velocidad variable por nivel
- Persistencia entre sesiones
- Sonidos/animaciones de muerte más allá del color azul + parpadeo

## Data model

```js
// src/js/maze.js
const POWER_CORNERS = [{x:1,y:3},{x:26,y:3},{x:1,y:23},{x:26,y:23}];
const POWER_PELLET = 4; // grid value: 0 vacío,1 muro,2 dot,3 puerta,4 power
const FRIGHTENED_MS = 7000;
const RESPAWN_MS = 10000;
const GHOST_SPEED_FRIGHTENED = 0.05;

// src/js/game.js — createGame() añade:
game.frightenedUntil = 0; // timestamp ms, 0 = inactivo
game.powerTimers = POWER_CORNERS.map(({x,y})=>({x,y, respawnAt:0}));
// grid[y][x]===4 si active, 0 si consumido esperando respawn

// ghost comido en frightened:
ghost.inPen=true; ghost.released=false; ghost.releaseTime=Date.now()+1500; // 1.5s
```

Convenciones: coordenadas celda `(x,y)` origen arriba-izq, `MAZE[y][x]`, `aligned()` igual que SPEC 02.

## Implementation plan

1. **maze.js: constantes** — añadir `POWER_CORNERS`, `POWER_PELLET=4`, `FRIGHTENED_MS`, `RESPAWN_MS` y exponer en `window`; no tocar `MAZE_STR` (los 4 corners ya son `.` → `2`).
2. **game.js: createGame()** — tras copiar `MAZE` a `grid`, para cada `POWER_CORNERS` set `grid[y][x]=4`; descontar esos 4 del conteo `dotsRemaining` (no son dots); inicializar `game.frightenedUntil=0` y `game.powerTimers`.
3. **game.js: consumo en movePacman()** — en bloque `aligned` donde ya se come `2`, añadir `else if grid[y][x]===4`: `grid[y][x]=0; game.score+=50; game.frightenedUntil=Date.now()+FRIGHTENED_MS; timer.respawnAt=Date.now()+RESPAWN_MS`.
4. **game.js: respawn en update()** — antes de `movePacman`, iterar `powerTimers`: si `respawnAt && now>=respawnAt && grid[y][x]===0` → `grid[y][x]=4; respawnAt=0`.
5. **game.js: frightened en decideGhost()/moveGhost()** — helper `isFrightened(game)=Date.now()<game.frightenedUntil`; si `isFrightened && !g.inPen` → `g.speed=GHOST_SPEED_FRIGHTENED`, invertir `dir` al entrar (una vez), elegir `random` entre `canMove`; si no frightened restaurar `GHOST_SPEED`. Guardar `g.wasFrightened` para detectar entrada/salida.
6. **game.js: colisión** — en loop `collides(pacman,g)`: si `isFrightened && !g.inPen` → `game.score+=200; g.inPen=true; g.released=false; g.releaseTime=now+1500; g.x=13; g.y=14; g.dir='up'` (1.5s, no `resetPositions`, no pierde vida); `else` lógica actual de perder vida.
7. **game.js: resetPositions()** — además de timers de release, limpiar `game.frightenedUntil=0` y mantener `powerTimers`/`grid` de pellets (no se resetean al perder vida).
8. **render.js: drawPowerPellets()** — nuevo `drawPowerPellets(ctx,grid,frame)` : si `v===4` dibujar círculo `r=6` color `#ffb8ae` con `alpha = 0.5+0.5*sin(frame*0.2)`; fantasmas frightened: `drawGhost` con `#2121ff` y ojos `#fff`, parpadeo últimos 2000ms `Math.floor(now/200)%2`.
9. **Verificación manual** — abrir `src/index.html`, comer esquina → fantasmas azules 7s, comer fantasma → +200 y vuelve al pen en 1.5s, pellet reaparece a los 10s, segundo pellet reinicia a 7s.

## Acceptance criteria

- [ ] 4 power pellets visibles al inicio en `(1,3),(26,3),(1,23),(26,23)`, tamaño mayor que dots y parpadeantes, sin errores en consola
- [ ] Comer power pellet suma 50 puntos, borra pellet (`grid=0`) y activa frightened 7s (fantasmas azules, velocidad reducida, huyen)
- [ ] Comer segundo pellet durante frightened reinicia timer a 7s desde ese momento
- [ ] Fantasma tocado en frightened suma 200 fijos, va a `(13,14)` con `inPen=true, released=false, releaseTime=now+1500` (1.5s) y vuelve a salir con su rol original
- [ ] Tras morir por fantasma normal (no frightened) Pac-Man pierde vida y frightened se cancela (`frightenedUntil=0`)
- [ ] Cada pellet reaparece exactamente 10s después de ser comido (`grid` vuelve a `4`) aunque Pac-Man muera entremedio
- [ ] Fuera de frightened los 4 roles hunter/ambusher/patrol/random y salida del pen cada 1.5s siguen iguales (SPEC 01/02 no regresión)
- [ ] `resetPositions` tras perder vida no resetea timers de respawn de pellets

## Decisions

- **Sí:** `grid=4` para power pellet — reusa matriz existente, render distingue por valor, cero archivos nuevos.
- **Sí:** 7s frightened + reinicio — estándar arcade, simple con un timestamp global.
- **Sí:** 10s respawn por pellet individual tras consumo — vs intervalo global; más jugable y evita reaparición encima sin lógica extra.
- **Sí:** 200 fijos por fantasma — sin multiplier 200/400/800/1600 (ese va en otro spec, ya estaba fuera en SPEC 01).
- **Sí:** fantasma comido → pen + `releaseTime=now+1500` (1.5s) — reusa `moveGhost` de SPEC 02 sin duplicar lógica de puerta.
- **Sí:** respawn incondicional (aunque Pac-Man esté encima) — evita check de colisión pellet/actor; el pellet se come al siguiente `aligned` frame, diff mínimo.
- **No:** IndexedDB/localStorage — sin persistencia.
- **No:** pellet como array separado fuera de `grid` — duplica fuente de verdad; `grid` ya resuelve colisión y render.
- **No:** velocidad 0 y freeze — huyen lento es más divertido que parados.

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Corner `(1,23)` parece pegado a pared en `MAZE_STR:32` | Verificado `MAZE_STR[23][1]=='.'` walkable; si fuese muro mover a `(2,23)` y documentar |
| Pellet respawnea bajo Pac-Man y da doble frightened instantáneo | Aceptado como edge raro; alternativa es chequear `!collides` antes de restaurar — añadir si molesta |
| Fantasma comido justo al expirar frightened | Chequear `isFrightened` en colisión con `now` fresco, no cacheado |
| Flash azul/blanco últimos 2s confunde con puerta `3` | Usar `#fff` solo en cuerpo fantasma, puerta sigue `#ffb8ff` en `render.js:53` |

## What is **not** in this spec

- Multiplier 200/400/800/1600 por racha, fruta, vidas extra
- Scatter/chase cíclico, velocidad por nivel
- Persistencia o leaderboard
- Sonidos

Cada uno, si se implementa, va en su propio spec.
