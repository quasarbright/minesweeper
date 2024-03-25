import {SetEqual} from "./setEqual";
import {Index, Minefield} from "./minefield";

export class CountSetSolver {
  readonly minefield: Minefield
  readonly countSets: CountSet[]
  constructor(minefield: Minefield, countSets: CountSet[]) {
    this.minefield = minefield
    this.countSets = countSets
  }

  // solve as much as possible without guessing
  public solve(): CountSetSolver {

  }
}

export class CountSet {
  readonly mineCount: number
  readonly indices: SetEqual<Index>
  readonly origin: Index | undefined
  constructor(mineCount: number, indices: SetEqual<Index>) {
    this.mineCount = mineCount
    this.indices = indices
  }
}