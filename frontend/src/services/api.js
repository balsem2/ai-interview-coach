const API_BASE_URL = "http://127.0.0.1:8000"

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token")

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
    }
  )

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.detail || "Request failed")
  }

  return payload
}

export async function loginUser(data) {
  return apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  )
}

export async function registerUser(data) {
  return apiRequest(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  )
}

export async function getCurrentUser() {
  return apiRequest(
    "/auth/me",
    {
      method: "GET"
    }
  )
}
