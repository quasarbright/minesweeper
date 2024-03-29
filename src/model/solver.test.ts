import {Minefield} from "./minefield";
import {CountSet, CountSetSolver} from "./solver";

describe('solver', () => {
  function solve(minefield: Minefield, useHint?: boolean) {
    return new CountSetSolver(minefield).solve(useHint).getMinefield()
  }

  function satSolve(minefield: Minefield, useHint?: boolean) {
    return new CountSetSolver(minefield).solveJustSat(useHint).getMinefield()
  }

  test('one mine random', () => {
    const minefield = new Minefield(4, 4, 1)
    expect(solve(minefield).isWin()).toBeTruthy()
  })

  test('one mine', () => {
    const minefield = Minefield.fromStrings([
        '111',
        '1*?',
    ])
    expect(solve(minefield, false).isWin()).toBeTruthy()
  })

  test('one mine sat', () => {
    const minefield = Minefield.fromStrings([
      '111',
      '1*?',
    ])
    expect(satSolve(minefield, false).isWin()).toBeTruthy()
  })

  test('one-one rule', () => {
    const minefield = Minefield.fromStrings([
        '111',
        '?*?',
    ])
    expect(solve(minefield, false).isWin()).toBeTruthy()
  })

  test('one-one rule sat', () => {
    const minefield = Minefield.fromStrings([
      '111',
      '?*?',
    ])
    expect(satSolve(minefield, false).isWin()).toBeTruthy()
  })

  test('one-one rule deep', () => {
    const minefield = Minefield.fromStrings([
        '?111*',
        '?*1??',
        '?????',

    ])
    // should be able to clear the bottom middle three
    // since the center 1's mine is either in the center left or center right.
    // from there, it should be able to solve
    const solved = solve(minefield)
    console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('one-two rule', () => {
    const minefield = Minefield.fromStrings([
        '?1221?',
        '??**??'
    ])
    expect(solve(minefield, false).isWin()).toBeTruthy()
  })

  test('one-two rule sat', () => {
    const minefield = Minefield.fromStrings([
      '?1221?',
      '??**??'
    ])
    expect(satSolve(minefield, false).isWin()).toBeTruthy()
  })

  // this fails sometimes due to 5050
  test('easy', () => {
    const minefield = new Minefield(9, 9, 10)
    expect(solve(minefield).isWin()).toBeTruthy()
  })

  test('easy sat', () => {
    const minefield = new Minefield(9, 9, 10)
    const solved = satSolve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('easy guess free', () => {
    const minefield = CountSetSolver.generateGuessFree(9, 9, 10)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('use total count', () => {
    const minefield = Minefield.fromStrings([
        'F11',
        '1?*',
        '1**'
    ])
    expect(solve(minefield, false).isWin()).toBeTruthy()
  })

  test.skip('medium', () => {
    const minefield = new Minefield(16, 16, 40)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test.skip('medium sat', () => {
    const minefield = new Minefield(16, 16, 40)
    const solved = satSolve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('medium guess free', () => {
    const minefield = CountSetSolver.generateGuessFree(16, 16, 40)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test.skip('hard', () => {
    const minefield = new Minefield(30, 16, 99)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('hard guess free', () => {
    const minefield = CountSetSolver.generateGuessFree(30, 16, 99)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })


  test.skip('evil', () => {
    const minefield = new Minefield(30, 20, 130)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })

  test('evil guess free', () => {
    const minefield = CountSetSolver.generateGuessFree(30, 20, 130)
    const solved = solve(minefield)
    // console.log(solved.toString())
    expect(solved.isWin()).toBeTruthy()
  })
})