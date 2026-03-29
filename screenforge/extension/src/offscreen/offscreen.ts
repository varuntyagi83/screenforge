// ScreenForge Extension — Offscreen Document
// Handles MediaRecorder (MV3 requires offscreen for getUserMedia/MediaRecorder)

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []

chrome.runtime.onMessage.addListener((message: { type: string; streamId?: string }) => {
  switch (message.type) {
    case 'OFFSCREEN_START':
      if (message.streamId) {
        void startRecording(message.streamId)
      }
      break
    case 'OFFSCREEN_STOP':
      stopRecording()
      break
  }
})

async function startRecording(streamId: string) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-expect-error Chrome-specific constraint
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        // @ts-expect-error Chrome-specific constraint
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    })

    chunks = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    mediaRecorder = new MediaRecorder(stream, { mimeType })

    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      // Store blob for upload
      void uploadRecording(blob)
      stream.getTracks().forEach((t) => t.stop())
    }

    mediaRecorder.start(1000)
  } catch (err) {
    console.error('Offscreen recording failed:', err)
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

async function uploadRecording(blob: Blob) {
  try {
    // Get stored auth token
    const { authToken, apiUrl } = await chrome.storage.local.get(['authToken', 'apiUrl']) as {
      authToken?: string
      apiUrl?: string
    }

    if (!authToken || !apiUrl) {
      console.error('No auth token or API URL configured')
      return
    }

    // Create recording metadata
    const metaRes = await fetch(`${apiUrl}/api/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `Extension Recording - ${new Date().toLocaleString()}`,
        mode: 'screen',
        durationSeconds: 0,
        mimeType: blob.type,
        fileSize: blob.size,
        localIdbKey: '',
      }),
    })

    if (!metaRes.ok) throw new Error('Failed to create recording')
    const { id } = await metaRes.json() as { id: string }

    // Upload blob
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')
    formData.append('recordingId', id)

    await fetch(`${apiUrl}/api/recordings/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData,
    })

    // Notify popup
    chrome.runtime.sendMessage({ type: 'UPLOAD_COMPLETE', recordingId: id })
  } catch (err) {
    console.error('Upload failed:', err)
    chrome.runtime.sendMessage({ type: 'UPLOAD_FAILED' })
  }
}
