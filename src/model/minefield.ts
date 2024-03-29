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

  public getNeighborUntouchedCount(index: Index) {
    return this.getNeighborCells(index).filter(cell => !cell.revealed && !cell.flagged).length
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

  public numUntouched() {
    return Array.from(this.indices()).map(index => this.getCell(index)).filter(cell => !cell.revealed && !cell.flagged).length
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
    sortByCenterDistance(this.width, this.height, indices)
    let bestCount = 8
    let bestIndex = indices[0]
    for(const index of indices) {
      const count = this.getNeighborMineCount(index)
      if (this.getCell(index).mine) {
        continue
      }
      if (count === 0) {
        return index
      } else if (count < bestCount) {
        bestCount = count
        bestIndex = index
      }
    }
    return bestIndex
  }

  public toString() {
    let s = ''
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const index = {row, col}
        const cell = this.getCell(index)
        const count = this.getNeighborMineCount(index)

        const content = (() => {
          if (cell.flagged) {
            if (cell.revealed) {
              return cell.mine ? 'F' : 'f'
            } else {
              return 'F'
            }
          } else if (cell.revealed && cell.mine) {
            return '*'
          } else if (cell.revealed) {
            if (count === 0) {
              return '-'
            } else {
              return count.toString(10)
            }
          } else {
            return '?'
          }
        })();
        s += content
      }
      s += '\n'
    }
    return s
  }

  // ? means hidden non-mine
  // * means hidden mine
  // F means hidden flagged mine
  // f means hidden flagged non-mine
  // - or a number means revealed non-mine
  // meant for testing
  // NOT the inverse of toString
  public static fromStrings(strings: string[]) {
    const height = strings.length
    const width = strings[0].length
    let numMines = 0
    const grid: Cell[][] = strings.map(rowString => Array.from(rowString).map(char => {
      switch (char) {
        case "?": return {revealed: false, mine: false, flagged: false}
        case "*":
          numMines++
          return {revealed: false, mine: true, flagged: false}
        case "F":
          numMines++
          return {revealed: false, mine: true, flagged: true}
        case "f": return {revealed: false, mine: false, flagged: true}
        case "-":
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return {revealed: true, mine: false, flagged: false}
        default:
          throw new Error("unknown cell character: " + char)
      }
    }))
    const minefield = new Minefield(width, height, numMines)
    minefield.grid = grid
    return minefield
  }

  // un-flag and hide all cells, preserving mines
  public reset(): Minefield {
    const that = this.clone()
    for (let row = 0; row < that.height; row++) {
      for (let col = 0; col < that.width; col++) {
        that.grid[row][col] = {
          ...that.grid[row][col],
          flagged: false,
          revealed: false,
        }
      }
    }
    return that
  }
}

export function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// swap the first and second halves of the array. like cutting a deck of cards.
function cutArray(array: any[]) {
  for(let i = 0; i + Math.floor(array.length / 2) < array.length; i++) {
    swap(array, i, i + Math.floor(array.length / 2))
  }
}

function swap(array: any[], i: number, j: number) {
  const tmp = array[i]
  array[i] = array[j]
  array[j] = tmp
}

// sort (in-place) the indices according to their taxicab distance from the center
function sortByCenterDistance(width: number, height: number, array: Index[]) {
  const center = {row: height/2, col: width/2}
  function centerDistance(index: Index) {
    return Math.abs(index.row - center.row) + Math.abs(index.col - center.col)
  }
  array.sort((a, b) => centerDistance(a) - centerDistance(b))
}