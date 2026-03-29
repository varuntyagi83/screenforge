// ScreenForge Extension — Content Script
// Injects a mini control bar into the page using Shadow DOM

let controlBar: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let isRecording = false
let isPaused = false
let startTime = 0
let timerInterval: ReturnType<typeof setInterval> | null = null

function createControlBar() {
  if (controlBar) return

  controlBar = document.createElement('div')
  controlBar.id = 'screenforge-control-bar'
  shadow = controlBar.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
    }
    .sf-bar {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(17, 17, 17, 0.9);
      backdrop-filter: blur(8px);
      border-radius: 999px;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      cursor: grab;
      user-select: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .sf-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      animation: sf-pulse 1.5s infinite;
    }
    .sf-dot.paused {
      background: #eab308;
      animation: none;
    }
    @keyframes sf-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .sf-timer {
      font-variant-numeric: tabular-nums;
      min-width: 60px;
    }
    .sf-btn {
      background: rgba(255,255,255,0.1);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .sf-btn:hover {
      background: rgba(255,255,255,0.2);
    }
  `

  const bar = document.createElement('div')
  bar.className = 'sf-bar'
  bar.innerHTML = `
    <span class="sf-dot" id="sf-dot"></span>
    <span class="sf-timer" id="sf-timer">00:00</span>
    <button class="sf-btn" id="sf-pause">⏸</button>
    <button class="sf-btn" id="sf-stop">⏹</button>
  `

  shadow.appendChild(style)
  shadow.appendChild(bar)
  document.body.appendChild(controlBar)

  // Dragging
  let isDragging = false
  let offsetX = 0
  let offsetY = 0

  bar.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    isDragging = true
    offsetX = e.clientX - bar.getBoundingClientRect().left
    offsetY = e.clientY - bar.getBoundingClientRect().top
    bar.setPointerCapture(e.pointerId)
    bar.style.cursor = 'grabbing'
  })

  bar.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return
    bar.style.position = 'fixed'
    bar.style.left = `${e.clientX - offsetX}px`
    bar.style.top = `${e.clientY - offsetY}px`
    bar.style.right = 'auto'
  })

  bar.addEventListener('pointerup', () => {
    isDragging = false
    bar.style.cursor = 'grab'
  })

  // Buttons
  shadow.getElementById('sf-pause')?.addEventListener('click', () => {
    if (isPaused) {
      chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' })
    } else {
      chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' })
    }
  })

  shadow.getElementById('sf-stop')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  })
}

function removeControlBar() {
  if (controlBar) {
    controlBar.remove()
    controlBar = null
    shadow = null
  }
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function updateTimer() {
  if (!shadow || isPaused) return
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  const timer = shadow.getElementById('sf-timer')
  if (timer) timer.textContent = `${m}:${s}`
}

function updatePauseState() {
  if (!shadow) return
  const dot = shadow.getElementById('sf-dot')
  const pauseBtn = shadow.getElementById('sf-pause')
  if (dot) dot.className = isPaused ? 'sf-dot paused' : 'sf-dot'
  if (pauseBtn) pauseBtn.textContent = isPaused ? '▶' : '⏸'
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message: { type: string; action?: string }) => {
  if (message.type !== 'RECORDING_STATE') return

  switch (message.action) {
    case 'STARTED':
      isRecording = true
      isPaused = false
      startTime = Date.now()
      createControlBar()
      timerInterval = setInterval(updateTimer, 1000)
      break

    case 'STOPPED':
      isRecording = false
      removeControlBar()
      break

    case 'PAUSED':
      isPaused = true
      updatePauseState()
      break

    case 'RESUMED':
      isPaused = false
      updatePauseState()
      break
  }
})
