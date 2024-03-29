import React, {useState} from 'react';
import './App.css';
import {Minefield} from "./model/minefield";
import {MinefieldView} from "./components/minefield";
import {CountSetSolver} from "./model/solver";

function App() {
  const [initialMinefield, setInitialMinefield] = useState(new Minefield(16,16,40))
  const [useNeighborRemainingMineCount, setUseNeighborRemainingMineCount] = useState(false)

  return (
      <div style={{padding: 10}}>
        <button
            onClick={() => setInitialMinefield(CountSetSolver.generateGuessFree(16, 16, 40))}
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
