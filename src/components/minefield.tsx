import {Index, Minefield} from "../model/minefield";
import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {CountSetSolver} from "../model/solver";

export interface MinefieldViewProps {
  initialMinefield: Minefield
  useRemainingNeighborMineCount?: boolean
  onUseRemainingChange: (useRemaining: boolean) => void
  onNewGame: () => void
}

export function MinefieldView({initialMinefield, useRemainingNeighborMineCount, onUseRemainingChange, onNewGame}: MinefieldViewProps) {
  const [minefield, setMinefield] = useState(initialMinefield)
  const initialZeroIndex = useMemo(() => {
    return initialMinefield.findZero()
  }, [initialMinefield])
  const numMines = minefield.numMines
  const numFlags = minefield.numFlags()
  const numMinesRemaining = numMines - numFlags

  const isOver = minefield.isWin() || minefield.isLoss()
  const [lost, setLost] = useState(false)
  // the board as the game ended, before every cell is revealed. Used only for drawing: which mine
  // went off, and which cells were still covered.
  const [endState, setEndState] = useState<Minefield | undefined>(undefined)

  const [startTime, setStartTime] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!minefield.isUntouched()) {
      setStartTime(Date.now())
    }
  }, [minefield.isUntouched()]);
  const [endTime, setEndTime] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (isOver) {
      setLost(minefield.isLoss())
      setEndState(minefield)
      setMinefield(minefield => minefield.revealAll())
      setEndTime(Date.now())
    }
  }, [isOver]);

  const [elapsedTime, setElapsedTime] = useState<number | undefined>(undefined)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (startTime !== undefined) {
        setElapsedTime(Math.floor(((endTime ?? Date.now()) - startTime) / 1000))
      }
    }, 100)
    return () => clearInterval(intervalId)
  }, [startTime, endTime]);

  const [solving, setSolving] = useState(false)
  useEffect(() => {
    if (solving) {
      // replay solution
      const minefields: Minefield[] = []
      new CountSetSolver(minefield, (minefield) => {
        minefields.push(minefield)
      }).solve();
      (async () => {
        for (const minefield of minefields) {
          setMinefield(minefield)
          if (minefield.isWin() || minefield.isLoss()) {
            break
          }
          await new Promise(r => setTimeout(r, 50))
        }
      })().then();
    }
  }, [solving]);

  // phones are tall: show a wide board on its side so the cells stay big enough to tap.
  // Only the drawing is transposed; the game sees the same rows and columns.
  const boardRef = useRef<HTMLDivElement>(null)
  const layout = useBoardLayout(boardRef, minefield.width, minefield.height)
  const displayRows = layout.transposed ? minefield.width : minefield.height
  const displayCols = layout.transposed ? minefield.height : minefield.width
  const toIndex = (r: number, c: number): Index => layout.transposed ? {row: c, col: r} : {row: r, col: c}

  // endState is set in the same update as `lost`, so the result never shows the wrong outcome
  const over = isOver && endState !== undefined
  const stage = over ? (lost ? 'lost' : 'won') : (solving ? 'solving' : 'playing')

  return (
      <section className={`ms-game is-${stage}`}>
        <div className="ms-score" aria-live="polite">
          <div className="ms-stat" title="Mines left: total mines minus the flags you've placed">
            <LedNumber value={numMinesRemaining}/>
            <span className="ms-stat-label">mines</span>
          </div>
          <div className="ms-stat" title="Seconds since your first move">
            <LedNumber value={elapsedTime ?? 0}/>
            <span className="ms-stat-label">time</span>
          </div>
        </div>

        <div className="ms-board-wrap" ref={boardRef}>
          <div className={`ms-board${solving ? ' is-solving' : ''}`}
               style={{
                 gridTemplateColumns: `repeat(${displayCols}, var(--cell))`,
                 '--cell': `${layout.cell}px`,
                 '--gap': `${layout.gap}px`,
               } as React.CSSProperties}
               role="grid"
               onContextMenu={event => event.preventDefault()}
          >
            {Array(displayRows).fill(null).map((_, r) => (
                Array(displayCols).fill(null).map((_, c) => {
                  const index = toIndex(r, c)
                  return (
                      <Cell key={`${index.row},${index.col}`}
                            minefield={minefield}
                            endState={endState}
                            index={index}
                            setMinefield={setMinefield}
                            isInitialZero={minefield.isUntouched() && JSON.stringify(index) === JSON.stringify(initialZeroIndex)}
                            useRemainingNeighborMineCount={useRemainingNeighborMineCount ?? false}
                            disabled={solving || isOver}
                      />
                  )
                })
            ))}
          </div>
        </div>

        {over ? (
            <div className="ms-result" role="status">
              <div className="ms-result-text">
                <strong>{lost ? 'Mine hit' : (solving ? 'Solver cleared it' : 'Cleared!')}</strong>
                {elapsedTime !== undefined && <span>{formatTime(elapsedTime)}</span>}
              </div>
              <button className="ms-btn is-primary" onClick={onNewGame} title="Start a new board at this difficulty">
                New game
              </button>
            </div>
        ) : (
            <div className="ms-controls">
              <div className="ms-count" role="radiogroup" aria-label="What the numbers show">
                <button role="radio" aria-checked={!useRemainingNeighborMineCount}
                        className={'ms-count-btn' + (!useRemainingNeighborMineCount ? ' is-on' : '')}
                        onClick={() => onUseRemainingChange(false)}
                        title="Numbers show how many mines touch the cell, flagged or not">
                  <MiniPair n={1}/>
                </button>
                <button role="radio" aria-checked={!!useRemainingNeighborMineCount}
                        className={'ms-count-btn' + (useRemainingNeighborMineCount ? ' is-on' : '')}
                        onClick={() => onUseRemainingChange(true)}
                        title="Numbers count down as you flag: each shows how many of its mines aren't flagged yet">
                  <MiniPair n={0}/>
                </button>
              </div>
              <button className="ms-btn ms-solve" disabled={solving}
                      onClick={() => setSolving(true)}
                      title="Watch the solver finish this board by logic alone, from where you are now">
                {solving ? 'Solving…' : 'Solve'}
              </button>
              <button className="ms-btn" disabled={solving} onClick={onNewGame}
                      title="Start a new board at this difficulty">
                New game
              </button>
            </div>
        )}
        <p className="ms-hint">
          {over
              ? (lost ? 'The mine that went off is in red. Flags on safe cells are crossed out.' : '\u00a0')
              : 'Right-click or long-press to flag. Tap a number whose mines are all flagged to clear around it.'}
        </p>
      </section>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// cell size: as big as fits (up to 40px), never below 20px. Narrow screens scroll sideways
// past that rather than shrinking cells below what a finger can hit.
function useBoardLayout(ref: React.RefObject<HTMLDivElement>, width: number, height: number) {
  const [layout, setLayout] = useState({cell: 32, gap: 3, transposed: false})
  useLayoutEffect(() => {
    function measure() {
      const el = ref.current
      if (!el) return
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight
      const portrait = vh > vw * 1.15
      const transposed = portrait && width > height
      const cols = transposed ? height : width
      const rows = transposed ? width : height
      const availW = el.clientWidth
      // on a landscape screen the whole game fits without scrolling: the board gets what's left
      // between its top edge and the controls, hint and footer below it (~185px)
      const top = el.getBoundingClientRect().top + window.scrollY
      const availH = Math.max(240, vh - top - 185)
      const pad = vw <= 600 ? 12 : 16
      const fit = (gap: number) => {
        const fitW = (availW - pad - (cols - 1) * gap) / cols
        const fitH = portrait ? Infinity : (availH - pad - (rows - 1) * gap) / rows
        return Math.max(18, Math.min(40, Math.floor(Math.min(fitW, fitH))))
      }
      let gap = 3
      let cell = fit(gap)
      if (cell < 28) {
        gap = 2
        cell = fit(gap)
      }
      setLayout({cell, gap, transposed})
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ref, width, height]);
  return layout
}

export interface CellProps {
  minefield: Minefield
  endState?: Minefield
  index: Index
  setMinefield: React.Dispatch<React.SetStateAction<Minefield>>
  isInitialZero: boolean
  useRemainingNeighborMineCount: boolean
  disabled?: boolean
}

const LONG_PRESS_MS = 380

export function Cell({minefield, endState, index, setMinefield, isInitialZero, useRemainingNeighborMineCount, disabled}: CellProps) {
  const cell = minefield.getCell(index)
  const absoluteCount = minefield.getNeighborMineCount(index)
  const count = useRemainingNeighborMineCount ? minefield.getNeighborRemainingMineCount(index) : absoluteCount
  const before = endState?.getCell(index)

  const classes = ['ms-cell']
  let content: React.ReactNode = null
  let label: string
  if (isInitialZero) {
    classes.push('is-hidden', 'is-start')
    label = 'covered, safe place to start'
  } else if (cell.flagged) {
    classes.push(cell.revealed ? 'is-open' : 'is-hidden', 'is-flagged')
    if (cell.revealed && !cell.mine) classes.push('is-wrong')
    if (cell.revealed && cell.mine) classes.push('is-right')
    content = <FlagIcon/>
    label = cell.revealed && !cell.mine ? 'flag on a safe cell' : 'flagged'
  } else if (cell.revealed && cell.mine) {
    classes.push('is-open', 'is-mine')
    if (before?.revealed) classes.push('is-boom')
    content = <MineIcon/>
    label = 'mine'
  } else if (cell.revealed) {
    classes.push('is-open')
    if (absoluteCount > 0) {
      classes.push(`n${count}`)
      content = count
    }
    label = absoluteCount > 0 ? String(count) : 'empty'
  } else {
    classes.push('is-hidden')
    label = 'covered'
  }
  // revealed only by the end-of-game reveal: drawn fainter than what the player uncovered
  if (before && !before.revealed && cell.revealed) classes.push('is-late')

  function flag() {
    if (!disabled) {
      setMinefield(minefield => minefield.flag(index))
    }
    return false
  }
  function clear() {
    if (!disabled) {
      setMinefield(minefield => minefield.reveal(index))
    }
  }

  // touch: a long press flags; the click that follows it is swallowed
  const pressTimer = useRef<number | undefined>(undefined)
  const pressStart = useRef<{x: number, y: number} | undefined>(undefined)
  const swallowClick = useRef(false)
  function cancelPress() {
    window.clearTimeout(pressTimer.current)
    pressTimer.current = undefined
  }

  return (
      <button
          className={classes.join(' ')}
          role="gridcell"
          aria-label={label}
          tabIndex={-1}
          onClick={() => {
            if (swallowClick.current) {
              swallowClick.current = false
              return
            }
            clear()
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            // a touch long-press already flagged
            if (pressStart.current === undefined && !swallowClick.current) flag()
          }}
          onPointerDown={(event) => {
            swallowClick.current = false
            if (event.pointerType !== 'touch' || disabled || cell.revealed) return
            pressStart.current = {x: event.clientX, y: event.clientY}
            pressTimer.current = window.setTimeout(() => {
              pressTimer.current = undefined
              swallowClick.current = true
              flag()
              if (navigator.vibrate) navigator.vibrate(12)
            }, LONG_PRESS_MS)
          }}
          onPointerMove={(event) => {
            const s = pressStart.current
            if (s && Math.hypot(event.clientX - s.x, event.clientY - s.y) > 10) cancelPress()
          }}
          onPointerUp={() => { cancelPress(); window.setTimeout(() => { pressStart.current = undefined }, 0) }}
          onPointerCancel={() => { cancelPress(); pressStart.current = undefined }}
      >
        {content}
      </button>
  )
}

// ---------- the scoreboard's segment digits ----------

// segments a..g on a 14×24 cell: a top, b upper right, c lower right, d bottom, e lower left,
// f upper left, g middle
const SEG_DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
}
const T = 2.4
function hSeg(x1: number, x2: number, y: number) {
  const h = T / 2
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`
}
function vSeg(x: number, y1: number, y2: number) {
  const h = T / 2
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`
}
const G = 0.7
const SEGMENTS: Record<string, string> = {
  a: hSeg(2 + G, 12 - G, 2),
  b: vSeg(12, 2 + G, 12 - G),
  c: vSeg(12, 12 + G, 22 - G),
  d: hSeg(2 + G, 12 - G, 22),
  e: vSeg(2, 12 + G, 22 - G),
  f: vSeg(2, 2 + G, 12 - G),
  g: hSeg(2 + G, 12 - G, 12),
}

function LedNumber({value}: {value: number}) {
  const clamped = Math.max(-99, Math.min(999, value))
  const text = clamped < 0 ? '-' + String(-clamped).padStart(2, '0') : String(clamped).padStart(3, '0')
  return (
      <span className="ms-led" aria-label={String(value)} role="img">
        {text.split('').map((ch, i) => (
            <svg key={i} viewBox="0 0 14 24" aria-hidden="true">
              {Object.entries(SEGMENTS).map(([name, points]) => (
                  <polygon key={name} points={points} className={SEG_DIGITS[ch].includes(name) ? 'on' : 'off'}/>
              ))}
            </svg>
        ))}
      </span>
  )
}

// ---------- icons ----------

function FlagIcon() {
  return (
      <svg className="ms-icon ms-flag" viewBox="0 0 24 24" aria-hidden="true">
        <path className="ms-flag-pole" d="M7 3v18"/>
        <path className="ms-flag-cloth" d="M8 4h10l-3 4 3 4H8z"/>
        <path className="ms-flag-base" d="M4.5 21h7"/>
      </svg>
  )
}

function MineIcon() {
  const spikes = [0, 45, 90, 135].map(a => {
    const r = (a * Math.PI) / 180
    const dx = Math.cos(r) * 9, dy = Math.sin(r) * 9
    return <path key={a} d={`M${12 - dx} ${12 - dy}L${12 + dx} ${12 + dy}`}/>
  })
  return (
      <svg className="ms-icon ms-mine" viewBox="0 0 24 24" aria-hidden="true">
        <g className="ms-mine-spikes">{spikes}</g>
        <circle cx="12" cy="12" r="6"/>
        <circle className="ms-mine-shine" cx="10" cy="10" r="1.6"/>
      </svg>
  )
}

// a flagged cell next to a 1, drawn with the board's own cell styles: with one flag beside it,
// the 1 reads 1 when numbers show total mines and 0 when they count down
function MiniPair({n}: {n: number}) {
  return (
      <span className="ms-mini" aria-hidden="true">
        <span className="ms-cell is-hidden is-flagged"><FlagIcon/></span>
        <span className={`ms-cell is-open n${n}`}>{n}</span>
      </span>
  )
}
