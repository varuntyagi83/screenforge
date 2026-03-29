import { google } from 'googleapis'

const FOLDER_NAME = 'ScreenForge Recordings'

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: 'v3', auth })
}

export async function findOrCreateAppFolder(accessToken: string): Promise<string> {
  const drive = getDriveClient(accessToken)

  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })

  return folder.data.id!
}

export async function uploadFile(
  accessToken: string,
  file: Buffer,
  options: { fileName: string; mimeType: string; folderId: string }
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient(accessToken)

  const res = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [options.folderId],
    },
    media: {
      mimeType: options.mimeType,
      body: file,
    },
    fields: 'id,webViewLink',
  })

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink ?? '',
  }
}

export async function getFileStream(accessToken: string, fileId: string) {
  const drive = getDriveClient(accessToken)
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )
  return res.data as NodeJS.ReadableStream
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const drive = getDriveClient(accessToken)
  await drive.files.delete({ fileId })
}

export async function updateFilePermission(
  accessToken: string,
  fileId: string,
  isPublic: boolean
): Promise<void> {
  const drive = getDriveClient(accessToken)
  if (isPublic) {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })
  } else {
    const perms = await drive.permissions.list({ fileId })
    const anyonePerms = perms.data.permissions?.filter((p) => p.type === 'anyone') ?? []
    for (const perm of anyonePerms) {
      if (perm.id) {
        await drive.permissions.delete({ fileId, permissionId: perm.id })
      }
    }
  }
}
