import {equal, SetEqual} from "./setEqual";
import {Index, Minefield, shuffleArray} from "./minefield";

export class CountSetSolver {
  private minefield: Minefield
  private countSets: CountSet[]
  constructor(minefield: Minefield, countSets?: CountSet[] | undefined) {
    this.minefield = minefield
    this.countSets = countSets || []
  }

  public getMinefield() {
    return this.minefield.clone()
  }

  // solve as much as possible without guessing
  public solve(useHint?: boolean): CountSetSolver {
    // applies a few hand-written rules with a SAT solver as a backup when that's not enough
    let that: CountSetSolver = this
    useHint = useHint ?? this.minefield.isUntouched()
    if (useHint) {
      that = that.revealHintCell()
    }

    that = that.updateCountSets()
    /*
    loop:
      loop:
        loop handleCertainties
        loop deduction
      loop satSolve
    only sat solve when others aren't enough
    and go back to others after deducing something from sat
     */
    return loop(that, [
      (that) => loop(that, [
        (that) => loop(that, [(that) => that.handleCertainties()]),
        (that) => loop(that, [(that) => that.deduction()]),
      ]),
      (that) => that.satSolve(true)
    ])
  }


  public solveJustSat(useHint?: boolean) {
    // only uses the SAT solver
    // useful for seeing when the hand-written rules aren't enough
    let that: CountSetSolver = this
    useHint = useHint ?? this.minefield.isUntouched()
    if (useHint) {
      that = that.revealHintCell()
    }

    that = that.updateCountSets()
    return loop(that, [(that) => that.satSolve(true)])
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
    return new CountSetSolver(this.minefield, this.countSets)
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
    return !cell.flagged && cell.revealed && this.minefield.getNeighborUntouchedCount(index) > 0
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
    return this.withFlagsAndReveals(toFlag, toReveal)
  }

  private withFlagsAndReveals(toFlag: Index[], toReveal: Index[]) {
    let minefield = this.minefield
    for (const index of toFlag) {
      minefield = minefield.flag(index, false)
    }
    for (const index of toReveal) {
      minefield = minefield.reveal(index)
    }
    return this.setMinefield(minefield).updateCountSets()
  }

  isSolved() {
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

  // sat solver
  // each cell is either a mine or not.
  // if a cell being a mine contradicts observations, it is not a mine, and vice versa.
  // for each cell, try to find contradictions
  private satSolve(breakOnFirstFind=true) {
    const frontier = this.getFrontier()
    const toFlag: Index[] = []
    const toReveal: Index[] = []
    if (this.isContradiction()) {
      throw new Error('cannot solve contradiction')
    }
    for (const index of frontier) {
      const withMine = this.considerMineAt(index)
      if (!withMine.isSatisfiable()) {
        toReveal.push(index)
        if (breakOnFirstFind) {
          break
        }
      } else {
        const withoutMine = this.considerNoMineAt(index)
        if (!withoutMine.isSatisfiable()) {
          toFlag.push(index)
          if (breakOnFirstFind) {
            break
          }
        }
      }
    }
    return this.withFlagsAndReveals(toFlag, toReveal)
  }

  // indices mentioned in count sets, excluding the total one
  // untouched cells adjacent to revealed ones
  private getFrontier(): SetEqual<Index> {
    const indices = new SetEqual<Index>()
    for (const countSet of this.countSets) {
      if (countSet.origin) {
        for (const index of countSet.indices) {
          indices.add(index)
        }
      }
    }
    return indices
  }

  private considerMineAt(index: Index) {
    // optimization: detect contradictions here so you don't have to scan the whole list after doing this
    return this.setCountSets(this.countSets.map(countSet => countSet.considerMineAt(index)))
  }

  private considerNoMineAt(index: Index) {
    // optimization: detect contradictions here so you don't have to scan the whole list after doing this
    return this.setCountSets(this.countSets.map(countSet => countSet.considerNoMineAt(index)))
  }

  private isContradiction() {
    for(const countSet of this.countSets) {
      if (countSet.isContradiction()) {
        return true
      }
    }
    return false
  }

  private isSatisfiable() {
    // optimization: split into connected components
    // optimization: generate possibilities for each count set, rather than all naive possibilities
    const frontier: Index[] = Array.from(this.getFrontier())
    return this.isSatisfiableHelp(frontier, 0)
  }

  // is there an assignment of the given indices that is consistent with observations?
  // indices and startIndex is used to simulate a linked list for recursion.
  // everything before startIndex in indices is ignored.
  private isSatisfiableHelp(indices: Index[], startIndex: number): boolean {
    if (this.isContradiction()) {
      return false
    } else if (startIndex === indices.length) {
      return true
    } else {
      const index = indices[startIndex]
      return (
          this.considerNoMineAt(index).isSatisfiableHelp(indices, startIndex + 1)
          || this.considerMineAt(index).isSatisfiableHelp(indices, startIndex + 1)
      )
    }
  }

  public static generateGuessFree(width: number, height: number, numMines: number): Minefield {
    let minefield = new Minefield(width, height, numMines)
    for (let i = 0; i < 100; i++) {
      const solver = new CountSetSolver(minefield.reset()).solve()
      minefield = solver.getMinefield()
      if (minefield.isWin()) {
        return minefield.reset()
      } else {
        // move a frontier mine away, beyond the frontier, into a spot that isn't already a mine
        // this eliminates 5050s
        // TODO randomly decide between moving a mine out of the frontier vs moving a mine INTO the frontier
        // this will avoid a concentration of mines on the outside
        const frontier = solver.getFrontier()
        const frontierArr = Array.from(frontier)
        shuffleArray(frontierArr)
        // if we don't declare this variable, eslint complains
        const currentMinefield = minefield
        const mineIndex = Array.from(frontierArr).find(index => currentMinefield.getCell(index).mine)
        if (!mineIndex) {
          // we're screwed, no way to move anything to fix it, start over
          // could happen like this:
          // 2F??
          // 2FFF
          // 1232
          // with 1 mine remaining
          minefield = new Minefield(width, height, numMines)
          continue
        }
        const indicesBeyondFrontier = Array.from(
            new SetEqual(minefield.indices()).subtract(frontier)
        ).filter(index => !currentMinefield.getCell(index).mine)
        if (indicesBeyondFrontier.length > 0) {
          shuffleArray(indicesBeyondFrontier)
          const indexBeyondFrontier = indicesBeyondFrontier.pop()
          minefield = minefield.setCell(mineIndex, {mine: false, flagged: false, revealed: false})
          minefield = minefield.setCell(indexBeyondFrontier, {mine: true, flagged: false, revealed: false})
        }
      }
    }
    throw new Error('unable to generate a guess-free minefield')
  }
}

// represents the number of mines present among a set of hidden cells
export class CountSet {
  // mine count is number of mines present among indices' cells
  readonly mineCount: number
  // indices of cells containing
  readonly indices: SetEqual<Index>
  // for debugging purposes, the index which created this information
  // undefined for the total mine count set
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
    if (that.mineCount === 1 && that.indices.intersect(this.indices).size() === 2 && this.indices.size() - this.mineCount === 1) {
      return this.subtract(that)
    } else {
      return this
    }
  }

  public subtract(that: CountSet): CountSet {
    return new CountSet(this.mineCount - that.mineCount, this.indices.subtract(that.indices), this.origin)
  }

  public considerMineAt(index: Index): CountSet {
    if (!this.indices.has(index)) {
      return this
    } else {
      return this.subtract(new CountSet(1, new SetEqual<Index>([index]), this.origin))
    }
  }

  public considerNoMineAt(index: Index): CountSet {
    if (!this.indices.has(index)) {
      return this
    } else {
      return this.subtract(new CountSet(0, new SetEqual<Index>([index]), this.origin))
    }
  }

  public isContradiction(): boolean {
    return this.mineCount < 0 || this.mineCount > this.indices.size()
  }
}


// helper for sequencing solver steps
// transform that through funcs, stopping at any point if it is solved
function block(that: CountSetSolver, funcs: ((solver: CountSetSolver) => CountSetSolver)[]) {
  for (const func of funcs) {
    if (that.isSolved()) {
      return that
    } else {
      that = func(that)
    }
  }
  return that
}

// helper for looping solver steps
// apply funcs over and over, stopping if it's solved or stops changing
function loop(that: CountSetSolver, funcs: ((solver: CountSetSolver) => CountSetSolver)[]) {
  while (true) {
    if (that.isSolved()) {
      return that
    } else {
      const newThat = block(that, funcs)
      if (equal(newThat, that)) {
        return that
      } else {
        that = newThat
      }
    }
  }
}
