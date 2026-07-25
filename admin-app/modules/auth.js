const TOKEN_KEY = "pbe_github_token";
const STATE_KEY = "pbe_oauth_state";

export class GitHubAuth {
  constructor(config) {
    this.config = config;
  }

  token() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  login() {
    if (!this.config.clientId || this.config.clientId.startsWith("UZUPELNIJ_")) {
      throw new Error("Najpierw ustaw GitHub Client ID w pliku admin-app/config.js.");
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);
    const query = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${location.origin}/admin/`,
      scope: this.config.scope,
      state
    });
    location.assign(`https://github.com/login/oauth/authorize?${query}`);
  }

  async completeCallback(exchangeEndpoint) {
    const query = new URLSearchParams(location.search);
    const code = query.get("code");
    if (!code) return false;
    const expectedState = sessionStorage.getItem(STATE_KEY);
    if (!expectedState || query.get("state") !== expectedState) {
      throw new Error("Nieprawidłowy stan OAuth. Rozpocznij logowanie ponownie.");
    }
    sessionStorage.removeItem(STATE_KEY);
    history.replaceState({}, document.title, "/admin/");
    const response = await fetch(exchangeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: `${location.origin}/admin/` })
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token) throw new Error(payload.error || "Nie udało się zalogować przez GitHub.");
    sessionStorage.setItem(TOKEN_KEY, payload.access_token);
    return true;
  }

  logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    location.assign("/admin/");
  }
}
