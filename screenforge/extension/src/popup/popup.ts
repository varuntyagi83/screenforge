// ScreenForge Extension — Popup Script

const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLSpanElement
const timerEl = document.getElementById('timer') as HTMLDivElement
const idleView = document.getElementById('idle-view') as HTMLDivElement
const recordingView = document.getElementById('recording-view') as HTMLDivElement

let timerInterval: ReturnType<typeof setInterval> | null = null
let startTime = 0

function updateUI(isRecording: boolean) {
  if (isRecording) {
    idleView.style.display = 'none'
    recordingView.style.display = 'block'
    statusEl.textContent = 'Recording'
    statusEl.className = 'status recording'
  } else {
    idleView.style.display = 'block'
    recordingView.style.display = 'none'
    statusEl.textContent = 'Idle'
    statusEl.className = 'status'
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
}

function startTimer() {
  startTime = Date.now()
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const s = (elapsed % 60).toString().padStart(2, '0')
    timerEl.textContent = `${m}:${s}`
  }, 1000)
}

// Get initial state
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state: { isRecording: boolean; startTime: number }) => {
  if (state?.isRecording) {
    updateUI(true)
    startTime = state.startTime
    startTimer()
  }
})

startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return

  startBtn.disabled = true
  chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id }, () => {
    updateUI(true)
    startTimer()
    startBtn.disabled = false
  })
})

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
    updateUI(false)
    timerEl.textContent = '00:00'
  })
})

// Listen for upload status
chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === 'UPLOAD_COMPLETE') {
    statusEl.textContent = 'Uploaded ✓'
    statusEl.className = 'status connected'
  } else if (message.type === 'UPLOAD_FAILED') {
    statusEl.textContent = 'Upload Failed'
    statusEl.className = 'status'
  }
})
