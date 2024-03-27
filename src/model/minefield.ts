import {SetEqual} from "./setEqual";

export interface Cell {
  revealed: boolean
  flagged: boolean
  mine: boolean
}

const defaultCell: Cell = {
  revealed: false,
  flagged: false,
  mine: false,
}

export interface Index {
  row: number
  col: number
}

export class Minefield {
  private grid: Cell[][]
  readonly height
  readonly width
  readonly numMines
  constructor(width: number, height: number, numMines: number) {
    this.grid = Array(height).fill(null).map(_ => Array(width).fill(null).map(_ => ({...defaultCell})))
    this.height = height
    this.width = width
    this.numMines = numMines
    this.addMines(numMines)
  }

  // in-place mutation
  private addMines(numMines: number) {
    const indices = Array.from(this.indices())
    shuffleArray(indices)
    for(let i = 0; i < Math.min(indices.length, numMines); i++) {
      const {row, col} = indices[i]
      this.grid[row][col] = {...this.grid[row][col], mine: true}
    }
  }

  public* indices(): Generator<Index> {
    for(let row = 0; row < this.height; row++) {
      for(let col = 0; col < this.width; col++) {
        yield({row, col})
      }
    }
  }

  // return copy with given cell merged into specified cell
  private mergeCell(index: Index, cell: Partial<Cell>) {
    return this.setCell(index, {...this.getCell(index), ...cell})
  }

  public setCell({row, col}: Index, cell: Cell) {
    const that = this.clone()
    that.grid[row][col] = cell
    return that
  }

  public clone() {
    const that = new Minefield(this.width, this.height, this.numMines)
    that.grid = this.grid.map(row => row.map(cell => ({...cell})))
    return that
  }

  public getCell({row, col}: Index) {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
      debugger
    }
    return this.grid[row][col]
  }

  public getNeighborMineCount(index: Index) {
    return this.getNeighborCells(index).filter(cell => cell.mine).length
  }

  public getNeighborFlagCount(index: Index) {
    return this.getNeighborCells(index).filter(cell => cell.flagged).length
  }

  public getNeighborRemainingMineCount(index: Index) {
    return this.getNeighborMineCount(index) - this.getNeighborFlagCount(index)
  }

  public getNeighborCells(index: Index) {
    return this.getNeighborIndices(index).map(index => this.getCell(index))
  }

  public getNeighborIndices(index: Index) {
    const indices = []
    for(let drow = -1; drow <= 1; drow++) {
      for(let dcol = -1; dcol <= 1; dcol++) {
        const row = index.row + drow
        const col = index.col + dcol
        const neighborIndex = {row, col}
        if(!(drow === 0 && dcol === 0) && row >= 0 && row < this.height && col >= 0 && col < this.width) {
          indices.push(neighborIndex)
        }
      }
    }
    return indices
  }

  // return copy with flag toggled at index
  public flag(index: Index, toggle = true) {
    if (this.getCell(index).revealed) {
      return this
    } else {
      if (toggle) {
        return this.mergeCell(index, {flagged: !this.getCell(index).flagged})
      } else {
        return this.mergeCell(index, {flagged: true})
      }
    }
  }

  // return copy with cell revealed.
  // if already revealed and num neighbor flags >= num neighbor mines, reveal neighbors
  public reveal(index: Index) {
    if (this.getCell(index).revealed && this.getNeighborFlagCount(index) >= this.getNeighborMineCount(index)) {
      let that: Minefield = this
      for (const neighborIndex of this.getNeighborIndices(index)) {
        that = that.revealSingleAndFloodRevealZeros(neighborIndex)
      }
      return that
    } else {
      return this.revealSingleAndFloodRevealZeros(index)
    }
  }

  private revealSingleAndFloodRevealZeros(index: Index) {
    if (this.getNeighborMineCount(index) === 0 && !this.getCell(index).flagged) {
      return this.floodRevealZeros(index)
    } else {
      return this.revealSingle(index)
    }
  }

  private revealSingle(index: Index) {
    if (this.getCell(index).flagged) {
      return this
    } else {
      return this.mergeCell(index, {revealed: true})
    }
  }

  // recursively reveal neighboring zeros
  private floodRevealZeros(index: Index) {
    const seen = new SetEqual<Index>()
    const stack = [index]
    let that: Minefield = this
    while (stack.length !== 0) {
      const index = stack.pop()!
      if(seen.has(index)) {
        continue
      }
      seen.add(index)
      const count = this.getNeighborMineCount(index)
      const wasAlreadyRevealed = that.getCell(index).revealed
      that = that.revealSingle(index)
      if (count === 0 && !wasAlreadyRevealed) {
        for(const neighborIndex of that.getNeighborIndices(index)) {
          stack.push(neighborIndex)
        }
      }
    }
    return that
  }

  public isWin() {
    for(const index of this.indices()) {
      const cell = this.getCell(index)
      if (!cell.mine && !cell.revealed) {
        return false
      }
    }
    return true
  }

  public isLoss() {
    for(const index of this.indices()) {
      const cell = this.getCell(index)
      if (cell.mine && cell.revealed) {
        return true
      }
    }
    return false
  }

  public revealAll() {
    let that: Minefield = this
    for (const index of this.indices()) {
      that = that.mergeCell(index, {revealed: true})
    }
    return that
  }

  public numFlags() {
    return Array.from(this.indices()).filter(index => this.getCell(index).flagged).length
  }

  public isUntouched() {
    for(const index of this.indices()) {
      if (this.getCell(index).revealed || this.getCell(index).flagged) {
        return false
      }
    }
    return true
  }

  // find the index of a zero, or a minimal mine-count cell if there are none.
  // TODO rename to hint or something
  public findZero() {
    const indices = Array.from(this.indices())
    shuffleArray(indices)
    let bestCount = 8
    let bestIndex = indices[0]
    for(const index of indices) {
      const count = this.getNeighborMineCount(index)
      if (count === 0) {
        return index
      } else if (count < bestCount) {
        bestCount = count
        bestIndex = index
      }
    }
    return bestIndex
  }
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
