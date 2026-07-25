export class GitHubApi {
  constructor({ token, owner, repo, branch }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.base}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {})
      }
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || `GitHub API: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async repository() {
    return this.request("");
  }

  async list(path) {
    return this.request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`);
  }

  async read(path) {
    const file = await this.request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`);
    return { ...file, text: decodeBase64(file.content) };
  }

  async writeText(path, text, message, sha) {
    return this.write(path, encodeText(text), message, sha);
  }

  async writeBinary(path, bytes, message, sha) {
    return this.write(path, encodeBytes(bytes), message, sha);
  }

  async write(path, content, message, sha) {
    return this.request(`/contents/${encodePath(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content,
        branch: this.branch,
        ...(sha ? { sha } : {})
      })
    });
  }

  async remove(path, sha, message) {
    return this.request(`/contents/${encodePath(path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: this.branch })
    });
  }
}

function encodePath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function encodeText(value) {
  return encodeBytes(new TextEncoder().encode(value));
}

function encodeBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
