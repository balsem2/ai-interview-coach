const API_BASE_URL = "http://127.0.0.1:8001"

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
    if (response.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.dispatchEvent(new Event("auth-expired"))
    }

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

export async function getRandomQuestion(filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.append(key, value)
    }
  })

  const query = params.toString()

  return apiRequest(
    `/questions/random${query ? `?${query}` : ""}`,
    {
      method: "GET"
    }
  )
}

export async function getQuestionFields() {
  return apiRequest(
    "/questions/fields",
    {
      method: "GET"
    }
  )
}

export async function sendChatMessage(data) {
  return apiRequest(
    "/chat/message",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  )
}

export async function startInterviewSession(data) {
  return apiRequest(
    "/chat/session/start",
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  )
}

export async function getFinalReport() {
  return apiRequest(
    "/chat/report",
    {
      method: "GET"
    }
  )
}
