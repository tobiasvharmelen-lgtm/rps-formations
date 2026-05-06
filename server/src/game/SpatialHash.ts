/**
 * Simple spatial hash for fast neighbor queries.
 * Rebuilt from scratch each tick — cheaper than incremental updates for ≤200 units.
 */
export class SpatialHash {
  private cells = new Map<number, number[]>();
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(id: number, x: number, y: number): void {
    const key = this.hashPos(x, y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(id);
  }

  /** Return all IDs within radius of (x, y). Includes the querying unit if inserted. */
  query(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCY = Math.floor((y - radius) / this.cellSize);
    const maxCY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(cx * 99_991 + cy);
        if (!cell) continue;
        for (const id of cell) {
          result.push(id);
        }
      }
    }
    return result;
  }

  /**
   * Like query() but also checks the horizontally-mirrored position when near
   * the left/right edges, supporting cylinder (horizontal wrap) maps.
   */
  queryWrapped(x: number, y: number, radius: number, mapWidth: number): number[] {
    const ids = new Set(this.query(x, y, radius));
    if (x - radius < 0) {
      for (const id of this.query(x + mapWidth, y, radius)) ids.add(id);
    }
    if (x + radius > mapWidth) {
      for (const id of this.query(x - mapWidth, y, radius)) ids.add(id);
    }
    return [...ids];
  }

  private hashPos(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return cx * 99_991 + cy;
  }
}
