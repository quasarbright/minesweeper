import React, {CSSProperties, useEffect, useState} from 'react';
import './App.css';
import {Minefield} from "./model/minefield";
import {MinefieldView} from "./components/minefield";
import {CountSetSolver} from "./model/solver";

const rightMarginStyle: CSSProperties = {
  marginRight: 10
}

function App() {
  const [width, setWidth] = useState(16)
  const [height, setHeight] = useState(16)
  const [numMines, setNumMines] = useState(40)
  const [difficultyOption, setDifficultyOption] = useState('medium')
  const [initialMinefield, setInitialMinefield] = useState(CountSetSolver.generateGuessFree(16,16, 40))
  const [useNeighborRemainingMineCount, setUseNeighborRemainingMineCount] = useState(false)

  useEffect(() => {
    setInitialMinefield(CountSetSolver.generateGuessFree(width, height, numMines))
  }, [width, height, numMines]);

  function onDifficultyChange(newDifficulty: string) {
    switch (newDifficulty) {
      case 'easy':
        setDifficultyOption('easy')
        setWidth(9)
        setHeight(9)
        setNumMines(10)
        break
      case 'medium':
        setDifficultyOption('medium')
        setWidth(16)
        setHeight(16)
        setNumMines(40)
        break
      case 'hard':
        setDifficultyOption('hard')
        setWidth(30)
        setHeight(16)
        setNumMines(99)
        break
      case 'evil':
        setDifficultyOption('evil')
        setWidth(30)
        setHeight(20)
        setNumMines(130)
        break
    }
  }

  return (
      <div style={{padding: 10}}>
        <label style={rightMarginStyle} htmlFor={'difficulty'}>Difficulty</label>
        <select style={rightMarginStyle} name={'difficulty'}
                defaultValue={'medium'}
                onChange={(event) => onDifficultyChange(event.target.value)}
        >
          <option value={'easy'}>Easy (9x9, 10 mines)</option>
          <option value={'medium'}>Medium (16x16, 40 mines)</option>
          <option value={'hard'}>Hard (30x16, 99 mines)</option>
          <option value={'evil'}>Evil (30x20, 130 mines)</option>
        </select>
        <button
            onClick={() => setInitialMinefield(CountSetSolver.generateGuessFree(width, height, numMines))}
        >
          New Game
        </button>
        <br/>
        <div style={{display: 'flex'}}>
          <input type={'checkbox'}
                 name={"use-remaining-mine-count"}
                 value={useNeighborRemainingMineCount ? 'true' : 'false'}
                 onChange={ev => setUseNeighborRemainingMineCount(b => !b)}
          />
          <label htmlFor={"use-remaining-mine-count"}>use neighbor remaining mine count</label>
        </div>
        <MinefieldView key={JSON.stringify(initialMinefield)} initialMinefield={initialMinefield}
                       useRemainingNeighborMineCount={useNeighborRemainingMineCount}/>
      </div>
  );
}

export default App;
