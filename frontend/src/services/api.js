const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token")
  const { retry = true, ...requestOptions } = options

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...requestOptions.headers
        },
      }
    )
  } catch {
    throw new Error(`Backend unavailable at ${API_BASE_URL}.`)
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      const refreshToken = localStorage.getItem("refreshToken")

      if (retry && refreshToken && path !== "/auth/refresh") {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        })

        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json()
          localStorage.setItem("token", refreshed.access_token)
          return apiRequest(path, { ...requestOptions, retry: false })
        }
      }

      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken")
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
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else if (value) {
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

export async function completeInterviewSession(sessionId, data) {
  return apiRequest(
    `/chat/session/${sessionId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  )
}

export async function skipInterviewQuestion(sessionId, questionId) {
  return apiRequest(
    `/chat/session/${sessionId}/skip`,
    {
      method: "POST",
      body: JSON.stringify({ question_id: questionId })
    }
  )
}

export async function getInterviewSessions() {
  return apiRequest("/chat/sessions", { method: "GET" })
}

export async function getFinalReport(sessionId = null) {
  return apiRequest(
    sessionId ? `/chat/session/${sessionId}/report` : "/chat/report",
    {
      method: "GET"
    }
  )
}

export async function getAnalyticsSummary() {
  return apiRequest(
    "/analytics/summary",
    {
      method: "GET"
    }
  )
}
