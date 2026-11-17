/* Portrait presentation: five columns, enemy above and ally below. */
(function (root, factory) {
  const board = factory();
  if (typeof module === 'object' && module.exports) module.exports = board;
  else root.BattleBoard = board;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Preserve the battle model's distances by rotating its coordinates 90 degrees.
  function project(position) {
    return { x: position.y, y: 10 - position.x };
  }
  function unproject(position) {
    return { x: 10 - position.y, y: position.x };
  }
  function pointerPosition(clientX, clientY, rect) {
    return unproject({ x: (clientX - rect.left) / rect.width * 5,
      y: (clientY - rect.top) / rect.height * 10 });
  }
  // Visible rows run from the centre/front to the bottom/back of the allied area.
  function deploymentCell(col, row) {
    return { col: 4 - row, row: col };
  }
  return { project, unproject, pointerPosition, deploymentCell };
});
