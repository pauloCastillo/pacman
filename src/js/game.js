// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      role: g.role || g.kind,
      kind: g.role || g.kind, // compat
      inPen: true,
      released: false,
      releaseTime: Date.now() + ( typeof RELEASE_DELAYS !== 'undefined' ? ( RELEASE_DELAYS[ g.role || g.kind ] || 0 ) : 0 ),
      patrolCorner: { x: 26, y: 0 },
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  if ( g.inPen ) return;
  const grid = game.grid;
  const p = game.pacman;
  const role = g.role || g.kind;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  let tx, ty;
  if ( role === 'hunter' ) {
    tx = Math.round( p.x );
    ty = Math.round( p.y );
  } else if ( role === 'ambusher' ) {
    const d = DIRS[ p.dir ] || { x: 0, y: 0 };
    tx = Math.round( p.x ) + d.x * 4;
    ty = Math.round( p.y ) + d.y * 4;
  } else if ( role === 'patrol' ) {
    // alterna entre (26,0) y (1,30) — si la esquina es muro, alterna al acercarse
    if ( Math.abs( Math.round( g.x ) - g.patrolCorner.x ) + Math.abs( Math.round( g.y ) - g.patrolCorner.y ) <= 1 ) {
      g.patrolCorner = g.patrolCorner.x === 26 ? { x: 1, y: 30 } : { x: 26, y: 0 };
    }
    tx = g.patrolCorner.x;
    ty = g.patrolCorner.y;
  } else {
    // random
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( g.inPen ) {
    if ( !g.released ) return;
    // escape: caminar hacia y=12 (puerta)
    if ( aligned( g.x ) && aligned( g.y ) ) {
      g.x = Math.round( g.x );
      g.y = Math.round( g.y );
      if ( g.y <= 12 ) {
        g.inPen = false;
        // centrar en salida
        if ( g.x !== 13 && g.x !== 14 ) g.x = 13;
        decideGhost( game, g );
      } else {
        // ir hacia la puerta (cols 13-14, y=12)
        if ( g.x < 13 ) g.dir = 'right';
        else if ( g.x > 14 ) g.dir = 'left';
        else g.dir = 'up';
      }
      if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
    }
    const d = DIRS[ g.dir ];
    if ( !d ) return;
    g.x += d.x * g.speed;
    g.y += d.y * g.speed;
    // al cruzar y<=12 ya está fuera
    if ( g.y <= 12 ) {
      g.y = Math.round( g.y );
      if ( g.y <= 12 ) g.inPen = false;
    }
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  const now = Date.now();
  game.ghosts.forEach( ( g, i ) => {
    const s = GHOST_STARTS[ i ];
    g.x = s.x;
    g.y = s.y;
    g.dir = 'up';
    g.role = s.role || s.kind;
    g.kind = g.role;
    g.inPen = true;
    g.released = false;
    g.releaseTime = now + ( typeof RELEASE_DELAYS !== 'undefined' ? ( RELEASE_DELAYS[ g.role ] || 0 ) : 0 );
    g.patrolCorner = { x: 26, y: 0 };
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  const now = Date.now();
  for ( const g of game.ghosts ) {
    if ( g.inPen && !g.released && now >= g.releaseTime ) g.released = true;
  }
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
