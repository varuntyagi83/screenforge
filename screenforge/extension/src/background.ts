// ScreenForge Extension — Background Service Worker

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  startTime: number
  pausedTime: number
  tabId: number | null
}

const state: RecordingState = {
  isRecording: false,
  isPaused: false,
  startTime: 0,
  pausedTime: 0,
  tabId: null,
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: { type: string; [key: string]: unknown }, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse(state)
      break

    case 'START_RECORDING':
      void startRecording(message.tabId as number).then(() => sendResponse({ success: true }))
      return true // async response

    case 'STOP_RECORDING':
      void stopRecording().then(() => sendResponse({ success: true }))
      return true

    case 'PAUSE_RECORDING':
      state.isPaused = true
      state.pausedTime = Date.now()
      notifyContentScript('PAUSED')
      sendResponse({ success: true })
      break

    case 'RESUME_RECORDING':
      state.isPaused = false
      notifyContentScript('RESUMED')
      sendResponse({ success: true })
      break
  }
  return false
})

async function startRecording(tabId: number) {
  try {
    // Create offscreen document for MediaRecorder
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    })

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Recording tab audio and video',
      })
    }

    // Get media stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })

    // Send to offscreen document to start recording
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_START',
      streamId,
      tabId,
    })

    state.isRecording = true
    state.isPaused = false
    state.startTime = Date.now()
    state.tabId = tabId

    // Notify content script to show control bar
    notifyContentScript('STARTED')
  } catch (err) {
    console.error('Failed to start recording:', err)
  }
}

async function stopRecording() {
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP' })

  state.isRecording = false
  state.isPaused = false
  state.tabId = null

  notifyContentScript('STOPPED')
}

function notifyContentScript(action: string) {
  if (state.tabId) {
    chrome.tabs.sendMessage(state.tabId, { type: 'RECORDING_STATE', action })
  }
}
