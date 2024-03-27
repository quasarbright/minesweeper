import {equal, SetEqual} from "./setEqual";
import {Index, Minefield} from "./minefield";

export class CountSetSolver {
  private minefield: Minefield
  private countSets: CountSet[]
  constructor(minefield: Minefield, countSets: CountSet[]) {
    this.minefield = minefield
    this.countSets = countSets
  }

  public getMinefield() {
    return this.minefield.clone()
  }

  // solve as much as possible without guessing
  public solve(): CountSetSolver {
    let that: CountSetSolver = this
    that = that.revealHintCell()
    that = that.updateCountSets()
    that = repeatUntilIdempotent(that, (that: CountSetSolver) => {
      if (that.isSolved()) {
        return that
      }
      that = repeatUntilIdempotent(that, (that: CountSetSolver) => that.handleCertainties())
      if (that.isSolved()) {
        return that
      }
      that = repeatUntilIdempotent(that, (that: CountSetSolver) => that.deduction())
      return that
    })
    // TODO SAT solver as backup
    return that
  }

  private revealHintCell(): CountSetSolver {
    return this.setMinefield(this.minefield.reveal(this.minefield.findZero()))
  }

  private setMinefield(minefield: Minefield): CountSetSolver {
    const that = this.clone()
    that.minefield = minefield
    return that
  }

  public clone(): CountSetSolver {
    return new CountSetSolver(this.minefield.clone(), this.countSets.slice())
  }

  private updateCountSets(): CountSetSolver {
    const countSets = []
    for(const index of this.minefield.indices()) {
      if (this.isInformative(index)) {
        countSets.push(CountSet.fromCell(this.minefield, index))
      }
    }
    countSets.push(CountSet.fromMinefieldTotal(this.minefield))
    return this.setCountSets(countSets)
  }

  private isInformative(index: Index) {
    const cell = this.minefield.getCell(index)
    return !cell.flagged && cell.revealed && this.minefield.getNeighborRemainingMineCount(index) > 0
  }

  private setCountSets(countSets: CountSet[]) {
    const that = this.clone()
    that.countSets = countSets
    return that
  }

  // detects all certainties and flags/reveals appropriately. also updates frontier.
  private handleCertainties(): CountSetSolver {
    const toFlag: Index[] = []
    const toReveal: Index[] = []
    for(const countSet of this.countSets) {
      const count = countSet.mineCount
      const size = countSet.indices.size()
      if (count === 0) {
        for (const index of countSet.indices) {
          toReveal.push(index)
        }
      }
      if (size === count) {
        for (const index of countSet.indices) {
          toFlag.push(index)
        }
      }
    }
    let minefield = this.minefield
    for (const index of toFlag) {
      minefield = minefield.flag(index, false)
    }
    for (const index of toReveal) {
      minefield = minefield.reveal(index)
    }
    return this.setMinefield(minefield).updateCountSets()
  }

  private isSolved() {
    return this.minefield.isWin()
  }

  // apply the subset rule and one-two rule wherever possible
  private deduction() {
    return this.applyBinaryRule((a, b) => a.applySubsetRule(b).applyOneTwoRule(b))
  }

  // apply the subset rule for "one round".
  // if one count set is a subset of another, you can subtract the subset out of the superset
  private applySubsetRule(): CountSetSolver {
    return this.applyBinaryRule((a,b) => a.applySubsetRule(b))
  }

  // apply a binary rule to every pair of count sets once
  // rule should return a new value for a
  private applyBinaryRule(rule: (a: CountSet, b: CountSet) => CountSet): CountSetSolver {
    const countSets = this.countSets.slice()
    for (let i = 0; i < countSets.length; i++) {
      for (let j = 0; j < countSets.length; j++) {
        if (i !== j) {
          countSets[i] = rule(countSets[i], countSets[j])
        }
      }
    }
    return this.setCountSets(countSets)
  }

  // apply the 1-2 rule.
  // if a 1-count overlaps 2 cells with an (N-1) count of size N, you can produce some certainties
  // example:
  /*
  ?12
  ABCD
   */
  // from the 2, we know exactly one of A,B,C is mine-free.
  // from the 1, we know there is at least one mine-free cell among B,C
  // therefore C is not the mine-free cell, so we can flag it.
  // more generally, if the 2 is a higher count and the condition is true, we can flag D,E,F,...
  // we could also split the 1-count into a 0-count and a size-2 1-count, but the other rules will handle that
  private applyOneTwoRule(): CountSetSolver {
    return this.applyBinaryRule((a, b) => a.applyOneTwoRule(b))
  }
}

export class CountSet {
  // mine count is num neighboring mines - num neighboring flags
  readonly mineCount: number
  readonly indices: SetEqual<Index>
  readonly origin: Index | undefined
  constructor(mineCount: number, indices: SetEqual<Index>, origin: Index | undefined) {
    this.mineCount = mineCount
    this.indices = indices
    this.origin = origin
  }

  static fromCell(minefield: Minefield, index: Index): CountSet {
    const indices = new SetEqual(
        minefield.getNeighborIndices(index).filter(index => {
          const cell = minefield.getCell(index)
          return !cell.revealed && !cell.flagged
        })
    )
    return new CountSet(minefield.getNeighborRemainingMineCount(index), indices, index)
  }

  static fromMinefieldTotal(minefield: Minefield): CountSet {
    const indices = new SetEqual(
        Array.from(minefield.indices()).filter(index => {
          const cell = minefield.getCell(index)
          return !cell.revealed && !cell.flagged
        })
    )
    return new CountSet(minefield.numMines - minefield.numFlags(), indices, undefined)
  }

  // apply subset rule, only if that is a subset of this
  // returns the difference
  public applySubsetRule(that: CountSet): CountSet {
    if (that.indices.isSubset(this.indices)) {
      return this.subtract(that)
    } else {
      return this
    }
  }

  // apply the one-two rule, only if that is a 1-count that overlaps with this on two indices
  public applyOneTwoRule(that: CountSet): CountSet {
    if (that.mineCount === 1 && that.indices.intersect(this.indices).size() === 2) {
      return this.subtract(that)
    } else {
      return this
    }
  }

  public subtract(that: CountSet): CountSet {
    return new CountSet(this.mineCount - that.mineCount, this.indices.subtract(that.indices), this.origin)
  }
}

// calls func on value over and over until the result stops changing, according to JSON stringify equality
function repeatUntilIdempotent<T>(value: T, func: (value: T) => T): T {
  const next = func(value)
  if (equal(value, next)) {
    return value
  } else {
    return repeatUntilIdempotent(next, func)
  }
}