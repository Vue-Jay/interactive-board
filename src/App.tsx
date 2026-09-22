import { useState } from 'react'
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

interface ToolButtonProps {
  id: Tool
  icon: string
  title: string
  activeTool: Tool
  onSelect: (tool: Tool) => void
}

function ToolButton({
  id,
  icon,
  title,
  activeTool,
  onSelect,
}: ToolButtonProps) {
  return (
    <button
      className={`tool-button ${activeTool === id ? 'active' : ''}`}
      onClick={() => onSelect(id)}
      title={title}
    >
      <span className="tool-icon">{icon}</span>
      <span className="tool-tooltip">{title}</span>
    </button>
  )
}

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [zoom, setZoom] = useState(100)
  const [boardTitle, setBoardTitle] = useState('Новая доска')

  const zoomIn = () => {
    setZoom((current) => Math.min(current + 10, 300))
  }

  const zoomOut = () => {
    setZoom((current) => Math.max(current - 10, 25))
  }

  const resetZoom = () => {
    setZoom(100)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <button className="back-button" title="Вернуться к доскам">
            ←
          </button>

          <div className="logo">
            <div className="logo-mark">B</div>
          </div>

          <input
            className="board-title"
            value={boardTitle}
            onChange={(event) => setBoardTitle(event.target.value)}
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

          <button className="share-button">Поделиться</button>
        </div>
      </header>

      <main className="workspace">
        <aside className="toolbar">
          <ToolButton
            id="select"
            icon="↖"
            title="Выделение"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="hand"
            icon="✋"
            title="Рука"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <ToolButton
            id="pen"
            icon="✎"
            title="Карандаш"
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
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <ToolButton
            id="text"
            icon="T"
            title="Текст"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="sticky"
            icon="▣"
            title="Стикер"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="shape"
            icon="○"
            title="Фигуры"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <ToolButton
            id="line"
            icon="╱"
            title="Линии и стрелки"
            activeTool={activeTool}
            onSelect={setActiveTool}
          />

          <div className="tool-divider" />

          <button className="tool-button" title="Добавить">
            <span className="tool-icon">＋</span>
            <span className="tool-tooltip">Добавить</span>
          </button>
        </aside>

        <section
          className={`board board-tool-${activeTool}`}
          aria-label="Рабочая область доски"
        >
          <div className="board-origin">
            <div className="welcome-card">
              <div className="welcome-badge">Первая доска</div>

              <h1>Начните создавать урок</h1>

              <p>
                Это наше бесконечное рабочее пространство. Скоро здесь можно
                будет писать, рисовать, размещать задания и работать вместе с
                учениками.
              </p>

              <div className="welcome-hint">
                Выбран инструмент:
                <strong>
                  {activeTool === 'select' && ' Выделение'}
                  {activeTool === 'hand' && ' Рука'}
                  {activeTool === 'pen' && ' Карандаш'}
                  {activeTool === 'marker' && ' Маркер'}
                  {activeTool === 'eraser' && ' Ластик'}
                  {activeTool === 'text' && ' Текст'}
                  {activeTool === 'sticky' && ' Стикер'}
                  {activeTool === 'shape' && ' Фигуры'}
                  {activeTool === 'line' && ' Линии'}
                </strong>
              </div>
            </div>
          </div>

          <div className="board-controls">
            <button onClick={zoomOut} title="Уменьшить">
              −
            </button>

            <button className="zoom-value" onClick={resetZoom}>
              {zoom}%
            </button>

            <button onClick={zoomIn} title="Увеличить">
              +
            </button>

            <button className="fit-button" title="Показать всю доску">
              ⛶
            </button>
          </div>

          <div className="minimap">
            <div className="minimap-label">Карта</div>
            <div className="minimap-world">
              <div className="minimap-object" />
              <div className="minimap-viewport" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App