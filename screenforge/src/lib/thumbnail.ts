export async function generateThumbnail(
  blob: Blob,
  timeSeconds: number = 2
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(blob)
    video.src = url

    video.onloadedmetadata = () => {
      // For short videos, capture at 0s
      const seekTime = video.duration < timeSeconds ? 0 : timeSeconds
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 270
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (thumbnailBlob) => {
          if (thumbnailBlob) {
            resolve(thumbnailBlob)
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        },
        'image/jpeg',
        0.8
      )
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video for thumbnail'))
    }
  })
}
