// Grid Snapping and Alignment Utilities

export function snapToGrid(value: number, gridSize = 1) {
  return Math.round(value / gridSize) * gridSize;
}

// Align objA adjacent to objB along X (left/right)
export function getSnappedPosition(
  objA: { x: number; width: number },
  objB: { x: number; width: number },
  direction: 'right' | 'left'
) {
  const aEdge = direction === 'right'
    ? objA.x + objA.width / 2
    : objA.x - objA.width / 2;
  const bEdge = direction === 'right'
    ? objB.x - objB.width / 2
    : objB.x + objB.width / 2;
  const delta = bEdge - aEdge;
  return {
    ...objA,
    x: objA.x + delta // snap objA bord à bord à objB
  };
}
