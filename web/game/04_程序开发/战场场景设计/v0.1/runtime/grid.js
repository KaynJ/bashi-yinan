/* Grid movement shared by the browser and the deterministic battle tests. */
(function (root, factory) {
  const grid = factory();
  if (typeof module === 'object' && module.exports) module.exports = grid;
  else root.GridMovement = grid;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 10, HEIGHT = 5;
  const key = cell => cell.col + ',' + cell.row;
  const center = cell => ({ x: cell.col + .5, y: cell.row + .5 });

  function occupied(battle, exceptId) {
    const cells = new Set();
    for (const unit of battle.units) {
      if (unit.hp <= 0 || unit.airborne || unit.id === exceptId) continue;
      cells.add(key(unit.cell));
      // Keep the origin occupied until arrival, and reserve the next cell now.
      // This rules out same-cell arrivals, head-on swaps and crossing paths.
      if (unit.move) cells.add(key(unit.move.to));
    }
    return cells;
  }

  function nextCell(battle, unit, target, range, contains) {
    const blocked = occupied(battle, unit.id);
    const goal = target.move ? center(target.move.to) : center(target.cell);
    const inRange = cell => {
      const p = center(cell);
      if (contains) return contains(p, goal);
      return Math.hypot(p.x - goal.x, p.y - goal.y) <= range + 1e-8;
    };
    if (inRange(unit.cell)) return null;
    const queue = [{ cell: unit.cell, first: null }], visited = new Set([key(unit.cell)]);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      const neighbours = [[1,0],[-1,0],[0,-1],[0,1]].map(([dx,dy]) => ({ col: current.cell.col + dx, row: current.cell.row + dy }))
        .filter(cell => cell.col >= 0 && cell.col < WIDTH && cell.row >= 0 && cell.row < HEIGHT)
        .sort((a,b) => {
          const ac = center(a), bc = center(b);
          return Math.hypot(ac.x-goal.x,ac.y-goal.y) - Math.hypot(bc.x-goal.x,bc.y-goal.y);
        });
      for (const cell of neighbours) {
        const id = key(cell);
        if (visited.has(id) || blocked.has(id)) continue;
        visited.add(id);
        const first = current.first || cell;
        if (inRange(cell)) return first;
        queue.push({ cell, first });
      }
    }
    return null;
  }

  function begin(unit, destination) {
    if (unit.move || unit.speed <= 0) return false;
    if (Math.abs(destination.col-unit.cell.col) + Math.abs(destination.row-unit.cell.row) !== 1) throw new RangeError('Movement must follow neighbouring grid cells');
    unit.move = { from: { ...unit.cell }, to: { ...destination }, progress: 0 };
    unit.moving = true;
    return true;
  }

  function advance(unit, dt) {
    if (!unit.move || (unit.move.speed||unit.speed) <= 0) return;
    const move = unit.move;
    move.progress = Math.min(1, move.progress + (move.speed||unit.speed) * dt/(move.length||1));
    const from = move.start || center(move.from), to = center(move.to);
    unit.x = from.x + (to.x-from.x) * move.progress;
    unit.y = from.y + (to.y-from.y) * move.progress;
    unit.moving = true;
    if (move.progress >= 1 - 1e-8) {
      unit.cell = { ...move.to }; unit.x = to.x; unit.y = to.y; unit.move = null;
    }
  }
  function push(unit,destination){
    const to=center(destination),start={x:unit.x,y:unit.y};
    unit.move={from:{...unit.cell},to:{...destination},start,progress:0,speed:5,length:Math.max(.01,Math.hypot(to.x-start.x,to.y-start.y)),forced:true};
    unit.moving=true;
  }

  function settle(unit, finishStep) {
    if (unit.move) unit.cell = { ...(finishStep ? unit.move.to : unit.move.from) };
    const position = center(unit.cell);
    unit.x = position.x; unit.y = position.y;
    unit.move = null; unit.moving = false;
  }

  return { WIDTH, HEIGHT, center, occupied, nextCell, begin, advance, settle, push };
});
