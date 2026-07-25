const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  const origin = event.headers.origin;
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (siteUrl && origin && new URL(origin).origin !== new URL(siteUrl).origin) {
    return response(403, { error: "Invalid origin" });
  }

  const { code, redirect_uri: redirectUri } = JSON.parse(event.body || "{}");
  if (!code || typeof code !== "string" || code.length > 256) {
    return response(400, { error: "Missing authorization code" });
  }
  if (!redirectUri || new URL(redirectUri).origin !== origin || new URL(redirectUri).pathname !== "/admin/") {
    return response(400, { error: "Invalid redirect URI" });
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return response(500, { error: "OAuth is not configured" });
  }

  const githubResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "polacywbelgii-cms"
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  const payload = await githubResponse.json();
  if (!githubResponse.ok || !payload.access_token) {
    return response(401, { error: payload.error_description || "GitHub authorization failed" });
  }

  return response(200, {
    access_token: payload.access_token,
    token_type: payload.token_type,
    scope: payload.scope
  });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}
