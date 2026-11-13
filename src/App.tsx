import React, {useEffect, useState} from 'react';
import './App.css';
import {Minefield} from "./model/minefield";
import {MinefieldView} from "./components/minefield";
import {CountSetSolver} from "./model/solver";

interface Difficulty {
  name: string
  width: number
  height: number
  numMines: number
}

const difficulties: Record<string, Difficulty> = {
  easy: {name: 'Easy', width: 9, height: 9, numMines: 10},
  medium: {name: 'Medium', width: 16, height: 16, numMines: 40},
  hard: {name: 'Hard', width: 30, height: 16, numMines: 99},
  evil: {name: 'Evil', width: 30, height: 20, numMines: 130},
}

function App() {
  const [difficultyOption, setDifficultyOption] = useState('medium')
  const [initialMinefield, setInitialMinefield] = useState<Minefield>()
  const [useNeighborRemainingMineCount, setUseNeighborRemainingMineCount] = useState(false)

  function newGame(difficulty: string) {
    const {width, height, numMines} = difficulties[difficulty]
    setInitialMinefield(CountSetSolver.generateGuessFree(width, height, numMines))
  }

  useEffect(() => {
    newGame('medium')
  }, []);

  function onDifficultyChange(newDifficulty: string) {
    setDifficultyOption(newDifficulty)
    newGame(newDifficulty)
  }

  return (
      <main className="ms-page">
        <header className="ms-head">
          <h1 className="ms-title">Minesweeper</h1>
          <p className="ms-sub">
            Every board can be cleared without guessing.{' '}
            <a href="https://quasarbright.github.io/blog/2024/04/guess-free-minesweeper.html"
               title="blog post on how the boards are generated and how the solver works">
              How it works
            </a>
          </p>
        </header>

        <div className="ms-difficulty" role="radiogroup" aria-label="Difficulty">
          {Object.entries(difficulties).map(([key, d]) => (
              <button key={key}
                      role="radio"
                      aria-checked={difficultyOption === key}
                      className={'ms-seg' + (difficultyOption === key ? ' is-on' : '')}
                      title={`New ${d.width}×${d.height} board with ${d.numMines} mines`}
                      onClick={() => onDifficultyChange(key)}
              >
                <span className="ms-seg-name">{d.name}</span>
                <span className="ms-seg-size">{d.width}×{d.height} · {d.numMines}</span>
              </button>
          ))}
        </div>

        {initialMinefield && (
            <MinefieldView key={JSON.stringify(initialMinefield)}
                           initialMinefield={initialMinefield}
                           useRemainingNeighborMineCount={useNeighborRemainingMineCount}
                           onUseRemainingChange={setUseNeighborRemainingMineCount}
                           onNewGame={() => newGame(difficultyOption)}
            />
        )}
      </main>
  );
}

export default App;
