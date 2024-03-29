import React, {useState} from 'react';
import './App.css';
import {Minefield} from "./model/minefield";
import {MinefieldView} from "./components/minefield";
import {CountSetSolver} from "./model/solver";

function App() {
  const [initialMinefield, setInitialMinefield] = useState(new Minefield(16,16,40))

  return (
      <div style={{padding: 10}}>
        <button onClick={() => setInitialMinefield(CountSetSolver.generateGuessFree(16, 16, 40))}>New Game</button>
        <MinefieldView key={JSON.stringify(initialMinefield)} initialMinefield={initialMinefield}/>
      </div>
  );
}

export default App;
