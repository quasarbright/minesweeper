import {Index, Minefield} from "../model/minefield";
import React, {useEffect, useMemo, useState} from "react";

export interface MinefieldViewProps {
  initialMinefield: Minefield
}

export function MinefieldView({initialMinefield}: MinefieldViewProps) {
  const [minefield, setMinefield] = useState(initialMinefield)
  const initialZeroIndex = useMemo(() => {
    return initialMinefield.findZero()
  }, [initialMinefield])
  const numMines = minefield.numMines
  const numFlags = minefield.numFlags()
  const numMinesRemaining = numMines - numFlags

  const isOver = minefield.isWin() || minefield.isLoss()
  const [lost, setLost] = useState(false)

  useEffect(() => {
    if (isOver) {
      setLost(minefield.isLoss())
      setMinefield(minefield => minefield.revealAll())
    }
  }, [isOver]);

  return (
      <div>
        <p>Mines remaining: {numMinesRemaining}</p>
        <table style={{borderCollapse: 'collapse'}}>
          {Array(minefield.height).fill(null).map((_, row) => (
              <tr style={{padding: 0}}>
                {Array(minefield.width).fill(null).map((_, col) => (
                    <td style={{padding: 0}}>
                      <Cell minefield={minefield}
                            index={{row, col}}
                            setMinefield={setMinefield}
                            isInitialZero={minefield.isUntouched() && JSON.stringify({row, col}) === JSON.stringify(initialZeroIndex)}
                      />
                    </td>
                ))}
              </tr>
          ))}
        </table>
        <h2>
          {isOver && (lost ? 'You lose' : 'You win!')}
        </h2>
      </div>
  )
}

export interface CellProps {
  minefield: Minefield
  index: Index
  setMinefield: React.Dispatch<React.SetStateAction<Minefield>>
  isInitialZero: boolean
}

export function Cell({minefield, index, setMinefield, isInitialZero}: CellProps) {
  const cell = minefield.getCell(index)
  const count = minefield.getNeighborMineCount(index)
  const hiddenStyle: React.CSSProperties = {
    backgroundColor: "gray",
    borderStyle: "solid",
    borderColor: "black",
    fontFamily: 'monospace',
    borderWidth: 1,
    width: '1.3em',
    height: '1.3em',
    fontSize: 24,
    padding: 0,
  }
  const revealedStyle: React.CSSProperties = {
    ...hiddenStyle,
    backgroundColor: 'white',
  }
  const style = cell.revealed ? revealedStyle : hiddenStyle
  const content = (() => {
    if (isInitialZero) {
      style.color = 'green'
      return 'X'
    } else if (cell.flagged) {
      if (cell.revealed) {
        style.backgroundColor = cell.mine ? 'green' : 'red'
      }
      return 'F'
    } else if (cell.revealed && cell.mine) {
      return '*'
    } else if (cell.revealed && count > 0) {
      style.color = (() => {
        switch (count) {
          case 1: return 'blue'
          case 2: return 'green'
          case 3: return 'red'
          case 4: return 'navy'
          case 5: return 'maroon'
          case 6: return 'teal'
          case 7: return 'black'
          case 8: return 'silver'
        }
      })()
      return count
    } else {
      return ' '
    }
  })();
  function flag() {
    setMinefield(minefield => minefield.flag(index))
    return false
  }
  function clear() {
    setMinefield(minefield => minefield.reveal(index))
  }

  return(
      <button
          style={style}
          onClick={clear}
          onContextMenu={(event) => {event.preventDefault(); flag()}}
      >
        <b>
          {content}
        </b>
      </button>
  )
}