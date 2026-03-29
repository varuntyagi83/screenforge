// ScreenForge Extension — Auth helpers

const GOOGLE_CLIENT_ID = '' // Set via extension options or env

export async function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: buildAuthUrl(),
        interactive: true,
      },
      (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          reject(new Error(chrome.runtime.lastError?.message ?? 'Auth failed'))
          return
        }

        const url = new URL(redirectUrl)
        const token = url.searchParams.get('access_token') ?? url.hash.match(/access_token=([^&]+)/)?.[1]

        if (token) {
          void chrome.storage.local.set({ authToken: token })
          resolve(token)
        } else {
          reject(new Error('No token in redirect'))
        }
      }
    )
  })
}

export async function getToken(): Promise<string | null> {
  const { authToken } = await chrome.storage.local.get('authToken') as { authToken?: string }
  return authToken ?? null
}

export async function signOut(): Promise<void> {
  await chrome.storage.local.remove('authToken')
}

function buildAuthUrl(): string {
  const redirectUri = chrome.identity.getRedirectURL()
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
  })
  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
}
