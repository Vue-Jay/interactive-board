import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import './App.css'

type Tool =
  | 'select'
  | 'hand'
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'shape'
  | 'line'

interface Viewport {
  x: number
  y: number
  zoom: number
}

interface Point {
  x: number
  y: number
}

interface ToolButtonProps {
  id: Tool
  icon: string
  title: string
  shortcut?: string
  activeTool: Tool
  onSelect: (tool: Tool) => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 8

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

function ToolButton({
  id,
  icon,
  title,
  shortcut,
  activeTool,
  onSelect,
}: ToolButtonProps) {
  return (
    <button
      className={`tool-button ${activeTool === id ? 'active' : ''}`}
      onClick={() => onSelect(id)}
      title={shortcut ? `${title} (${shortcut})` : title}
    >
      <span className="tool-icon">{icon}</span>

      <span className="tool-tooltip">
        <span>{title}</span>
        {shortcut && <kbd>{shortcut}</kbd>}
      </span>
    </button>
  )
}

function App() {
  const boardRef = useRef<HTMLElement | null>(null)

  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [boardTitle, setBoardTitle] = useState('Новая доска')

  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
  })

  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)

  const [mouseWorld, setMouseWorld] = useState<Point>({
    x: 0,
    y: 0,
  })

  const panStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    viewportX: 0,
    viewportY: 0,
  })

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const board = boardRef.current

      if (!board) {
        return { x: 0, y: 0 }
      }

      const rect = board.getBoundingClientRect()

      return {
        x: (screenX - rect.left - viewport.x) / viewport.zoom,
        y: (screenY - rect.top - viewport.y) / viewport.zoom,
      }
    },
    [viewport],
  )

  const zoomAtPoint = useCallback(
    (newZoom: number, clientX: number, clientY: number) => {
      const board = boardRef.current

      if (!board) {
        return
      }

      const rect = board.getBoundingClientRect()

      setViewport((current) => {
        const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM)

        const localX = clientX - rect.left
        const localY = clientY - rect.top

        const worldX = (localX - current.x) / current.zoom
        const worldY = (localY - current.y) / current.zoom

        return {
          zoom: clampedZoom,
          x: localX - worldX * clampedZoom,
          y: localY - worldY * clampedZoom,
        }
      })
    },
    [],
  )

  const zoomToCenter = useCallback((factor: number) => {
    const board = boardRef.current

    if (!board) {
      return
    }

    const rect = board.getBoundingClientRect()

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    setViewport((current) => {
      const newZoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM)

      const localX = centerX - rect.left
      const localY = centerY - rect.top

      const worldX = (localX - current.x) / current.zoom
      const worldY = (localY - current.y) / current.zoom

      return {
        zoom: newZoom,
        x: localX - worldX * newZoom,
        y: localY - worldY * newZoom,
      }
    })
  }, [])

  const resetView = useCallback(() => {
    setViewport({
      x: 0,
      y: 0,
      zoom: 1,
    })
  }, [])

  const handleWheel = (event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault()

    if (event.ctrlKey) {
      const factor = Math.exp(-event.deltaY * 0.002)

      zoomAtPoint(
        viewport.zoom * factor,
        event.clientX,
        event.clientY,
      )

      return
    }

    setViewport((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }))
  }

  const shouldStartPan = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const middleMouse = event.button === 1
    const handTool = activeTool === 'hand' && event.button === 0
    const temporaryHand = spacePressed && event.button === 0

    return middleMouse || handTool || temporaryHand
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!shouldStartPan(event)) {
      return
    }

    event.preventDefault()

    event.currentTarget.setPointerCapture(event.pointerId)

    panStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      viewportX: viewport.x,
      viewportY: viewport.y,
    }

    setIsPanning(true)
  }

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const worldPoint = screenToWorld(
      event.clientX,
      event.clientY,
    )

    setMouseWorld(worldPoint)

    if (!isPanning) {
      return
    }

    const start = panStartRef.current

    const deltaX = event.clientX - start.pointerX
    const deltaY = event.clientY - start.pointerY

    setViewport((current) => ({
      ...current,
      x: start.viewportX + deltaX,
      y: start.viewportY + deltaY,
    }))
  }

  const stopPanning = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!isPanning) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setIsPanning(false)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.code === 'Space' && !isTyping) {
        event.preventDefault()
        setSpacePressed(true)
      }

      if (isTyping) {
        return
      }

      if (event.key.toLowerCase() === 'v') {
        setActiveTool('select')
      }

      if (event.key.toLowerCase() === 'h') {
        setActiveTool('hand')
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === '0'
      ) {
        event.preventDefault()
        resetView()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
      }
    }

    const handleWindowBlur = () => {
      setSpacePressed(false)
      setIsPanning(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [resetView])

  const zoomPercent = Math.round(viewport.zoom * 100)

  const effectiveHand = activeTool === 'hand' || spacePressed

  const gridSize = 24 * viewport.zoom

  const backgroundPositionX =
    ((viewport.x % gridSize) + gridSize) % gridSize

  const backgroundPositionY =
    ((viewport.y % gridSize) + gridSize) % gridSize

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="back-button"
            title="Вернуться к доскам"
          >
            ←
          </button>

          <div className="logo">
            <div className="logo-mark">B</div>
          </div>

          <input
            className="board-title"
            value={boardTitle}
            onChange={(event) =>
              setBoardTitle(event.target.value)
            }
            aria-label="Название доски"
          />

          <span className="save-status">
            <span className="save-dot" />
            Сохранено
          </span>
        </div>

        <div className="topbar-center">
          <button className="top-button" title="Отменить">
            ↶
          </button>

          <button className="top-button" title="Повторить">
            ↷
          </button>
        </div>

        <div className="topbar-right">
          <div className="avatars">
            <div className="avatar">Я</div>
          </div>

          <button className="lesson-button">
            <span>▶</span>
            Начать урок
          </button>

          <button className="share-button">
            Поделиться
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="toolbar">
          <ToolButton
            id="select"
            icon="↖"
            title="Выделение"
            shortcut="V"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="hand"
            icon="✋"
            title="Рука"
            shortcut="H"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <ToolButton
            id="pen"
            icon="✎"
            title="Карандаш"
            shortcut="P"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="marker"
            icon="▰"
            title="Маркер"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="eraser"
            icon="◇"
            title="Ластик"
            shortcut="E"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <ToolButton
            id="text"
            icon="T"
            title="Текст"
            shortcut="T"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="sticky"
            icon="▣"
            title="Стикер"
            shortcut="S"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="shape"
            icon="○"
            title="Фигуры"
            shortcut="R"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="line"
            icon="╱"
            title="Линии и стрелки"
            shortcut="L"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <button
            className="tool-button"
            title="Добавить"
          >
            <span className="tool-icon">＋</span>
            <span className="tool-tooltip">
              <span>Добавить</span>
            </span>
          </button>
        </aside>

        <section
          ref={boardRef}
          className={[
            'board',
            `board-tool-${activeTool}`,
            effectiveHand ? 'board-hand-active' : '',
            isPanning ? 'board-panning' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Рабочая область доски"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          style={{
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
          }}
        >
          <div
            className="world"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            }}
          >
            <div className="world-origin-marker">
              <span>0, 0</span>
            </div>

            <div className="welcome-card">
              <div className="welcome-badge">
                Первая доска
              </div>

              <h1>Начните создавать урок</h1>

              <p>
                Теперь это настоящее бесконечное пространство.
                Выберите инструмент «Рука» или удерживайте
                пробел, чтобы перемещаться по доске.
              </p>

              <div className="welcome-hint">
                <div>
                  <strong>H</strong> — рука
                </div>

                <div>
                  <strong>V</strong> — выделение
                </div>

                <div>
                  <strong>Space</strong> — временная рука
                </div>

                <div>
                  <strong>Ctrl + колесо</strong> — масштаб
                </div>
              </div>
            </div>
          </div>

          <div className="coordinates">
            x: {Math.round(mouseWorld.x)} &nbsp; y:{' '}
            {Math.round(mouseWorld.y)}
          </div>

          <div className="board-controls">
            <button
              onClick={() => zoomToCenter(0.8)}
              title="Уменьшить"
            >
              −
            </button>

            <button
              className="zoom-value"
              onClick={resetView}
              title="Вернуться к 100%"
            >
              {zoomPercent}%
            </button>

            <button
              onClick={() => zoomToCenter(1.25)}
              title="Увеличить"
            >
              +
            </button>

            <button
              className="fit-button"
              onClick={resetView}
              title="Вернуться к началу доски"
            >
              ⛶
            </button>
          </div>

          <div className="minimap">
            <div className="minimap-label">
              Навигация
            </div>

            <div className="minimap-info">
              <span>X {Math.round(viewport.x)}</span>
              <span>Y {Math.round(viewport.y)}</span>
              <span>{zoomPercent}%</span>
            </div>

            <div className="minimap-world">
              <div className="minimap-origin" />
              <div className="minimap-viewport" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App