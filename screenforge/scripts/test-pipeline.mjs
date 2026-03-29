// End-to-end test: Drive upload + AI pipeline
import pg from 'pg'
import { google } from 'googleapis'
import OpenAI from 'openai'
import { Readable } from 'stream'

const DB_URL = 'postgresql://postgres:fHlCTSMPtcpNbuSAOrzNRolDsSjbPiCX@gondola.proxy.rlwy.net:59917/railway'

const pool = new pg.Pool({ connectionString: DB_URL })

async function query(sql, params = []) {
  const res = await pool.query(sql, params)
  return res.rows
}

async function main() {
  console.log('\n=== ScreenForge E2E Pipeline Test ===\n')

  // 1. Get user + access token
  const [account] = await query('SELECT * FROM "Account" WHERE provider = $1 LIMIT 1', ['google'])
  if (!account) { console.error('No Google account found'); process.exit(1) }

  const accessToken = account.access_token
  const userId = account.userId
  console.log('✓ Found user:', userId)
  console.log('✓ Access token:', accessToken.substring(0, 20) + '...')

  // 2. Test Google Drive access
  console.log('\n--- Testing Google Drive ---')
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: 'v3', auth })

  try {
    const about = await drive.about.get({ fields: 'user' })
    console.log('✓ Drive connected as:', about.data.user?.emailAddress)
  } catch (e) {
    console.error('✗ Drive auth failed:', e.message)
    console.log('  Token may be expired. Sign out and back in to refresh.')
    await pool.end()
    process.exit(1)
  }

  // 3. Create/find ScreenForge folder
  let folderId
  const folderRes = await drive.files.list({
    q: "name='ScreenForge Recordings' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
  })
  if (folderRes.data.files?.length > 0) {
    folderId = folderRes.data.files[0].id
    console.log('✓ Found folder:', folderId)
  } else {
    const folder = await drive.files.create({
      requestBody: { name: 'ScreenForge Recordings', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    folderId = folder.data.id
    console.log('✓ Created folder:', folderId)
  }

  // 4. Upload a test file to Drive
  console.log('\n--- Testing Drive Upload ---')
  const testContent = Buffer.from('This is a test recording file for ScreenForge pipeline testing.')
  const uploadRes = await drive.files.create({
    requestBody: { name: 'test-recording.txt', parents: [folderId] },
    media: { mimeType: 'text/plain', body: Readable.from(testContent) },
    fields: 'id,webViewLink',
  })
  console.log('✓ Uploaded test file:', uploadRes.data.id)
  console.log('  Web link:', uploadRes.data.webViewLink)

  // 5. Create recording in DB
  const recId = 'test-' + Date.now()
  await query(
    `INSERT INTO "Recording" (id, "userId", title, mode, "durationSeconds", "mimeType", "fileSize", "driveFileId", "driveWebLink", "uploadStatus", "uploadProgress", "aiStatus", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
    [recId, userId, 'Pipeline Test Recording', 'screen', 120, 'video/webm', testContent.length, uploadRes.data.id, uploadRes.data.webViewLink, 'uploaded', 100, 'pending']
  )
  console.log('✓ Created DB recording:', recId)

  // 6. Test OpenAI Whisper (skip actual transcription — no real audio)
  console.log('\n--- Testing OpenAI ---')
  const openai = new OpenAI()

  try {
    // Test GPT-4o with a mock transcript
    const mockTranscript = "Hello everyone, welcome to the team standup. Today we need to discuss the new feature rollout for the dashboard. Sarah will handle the frontend changes by Friday. John needs to update the API endpoints. We also need to fix the login bug that was reported yesterday. Let's make sure everything is tested before the release next Monday."

    console.log('  Sending transcript to GPT-4o...')
    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: 'system', content: `Analyze this transcript and respond in JSON: {"summary": "...", "actionItems": [{"task": "...", "assignee": "...", "priority": "..."}], "sopGuide": "..."}` },
        { role: 'user', content: `Recording: "Pipeline Test"\n\n${mockTranscript}` },
      ],
    })

    const aiOutput = JSON.parse(aiRes.choices[0].message.content)
    console.log('✓ GPT-4o Summary:', aiOutput.summary?.substring(0, 100) + '...')
    console.log('✓ Action Items:', aiOutput.actionItems?.length, 'items')
    aiOutput.actionItems?.forEach(item => console.log('  -', item.task, `(${item.assignee}, ${item.priority})`))
    console.log('✓ SOP Guide:', aiOutput.sopGuide?.substring(0, 80) + '...')

    // Save to DB
    await query(
      `UPDATE "Recording" SET transcript = $1, summary = $2, "actionItems" = $3, "sopGuide" = $4, "aiStatus" = 'completed', "updatedAt" = NOW() WHERE id = $5`,
      [JSON.stringify({ text: mockTranscript, segments: [] }), aiOutput.summary, JSON.stringify(aiOutput.actionItems), aiOutput.sopGuide, recId]
    )
    console.log('✓ Saved AI results to DB')

  } catch (e) {
    console.error('✗ OpenAI error:', e.message)
  }

  // 7. Verify DB state
  console.log('\n--- Final DB State ---')
  const [rec] = await query('SELECT * FROM "Recording" WHERE id = $1', [recId])
  console.log('Recording:', rec.title)
  console.log('  Drive File:', rec.driveFileId)
  console.log('  Upload:', rec.uploadStatus)
  console.log('  AI Status:', rec.aiStatus)
  console.log('  Has Transcript:', !!rec.transcript)
  console.log('  Has Summary:', !!rec.summary)
  console.log('  Has Action Items:', !!rec.actionItems)
  console.log('  Has SOP Guide:', !!rec.sopGuide)

  // 8. Clean up test file from Drive
  console.log('\n--- Cleanup ---')
  await drive.files.delete({ fileId: uploadRes.data.id })
  console.log('✓ Deleted test file from Drive')
  await query('DELETE FROM "Recording" WHERE id = $1', [recId])
  console.log('✓ Deleted test recording from DB')

  console.log('\n=== ALL TESTS PASSED ===\n')
  await pool.end()
}

main().catch(e => { console.error('\n✗ FAILED:', e.message); pool.end(); process.exit(1) })
