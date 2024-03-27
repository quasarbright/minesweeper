import {Minefield} from "./minefield";
import {CountSetSolver} from "./solver";

describe('solver', () => {
  test('one mine', () => {
    const minefield = new Minefield(4, 4, 1)
    let solver = new CountSetSolver(minefield, [])
    solver = solver.solve()
    expect(solver.getMinefield().isWin()).toBeTruthy()
  })
})