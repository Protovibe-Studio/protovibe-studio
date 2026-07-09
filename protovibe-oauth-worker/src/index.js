// Protovibe OAuth token-exchange worker.
//
// The Protovibe project manager runs on the user's machine and cannot hold the
// GitHub App client secret, so it sends the OAuth authorization code here and
// this worker performs the code → access-token exchange server-to-server.

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/exchange') {
      return handleExchange(request, env)
    }

    return json(404, { error: 'not-found' })
  },
}

async function handleExchange(request, env) {
  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid-json' })
  }

  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) return json(400, { error: 'missing-code' })

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json(500, { error: 'worker-not-configured' })
  }

  let ghRes
  try {
    ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'protovibe-oauth-worker',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
  } catch {
    return json(502, { error: 'github-unreachable' })
  }

  let data
  try {
    data = await ghRes.json()
  } catch {
    return json(502, { error: 'github-bad-response' })
  }

  // GitHub returns 200 even for failures — the error lives in the body.
  if (!data.access_token) {
    return json(400, { error: data.error || 'exchange-failed' })
  }

  return json(200, { access_token: data.access_token })
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
