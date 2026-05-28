import { useEffect, useState } from "react"

import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import InterviewRoom from "./pages/InterviewRoom"
import Report from "./pages/Report"
import Analytics from "./pages/Analytics"
import { getCurrentUser } from "./services/api"

const protectedPages = ["dashboard", "interview", "report", "analytics"]

function App() {

  const [page, setPage] = useState(() => localStorage.getItem("token") ? "dashboard" : "login")
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user")
    return savedUser ? JSON.parse(savedUser) : null
  })

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token) {
      return
    }

    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        localStorage.setItem("user", JSON.stringify(currentUser))
      })
      .catch(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
        setPage("login")
      })
  }, [])

  const onNavigate = (newPage) => {
    if (newPage === "logout") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      setUser(null)
      setPage("login")
      return
    }

    if (protectedPages.includes(newPage) && !localStorage.getItem("token")) {
      setPage("login")
      return
    }

    setPage(newPage)
  }

  const handleAuthSuccess = (authUser) => {
    setUser(authUser)
    localStorage.setItem("user", JSON.stringify(authUser))
    setPage("dashboard")
  }

  if (protectedPages.includes(page) && !localStorage.getItem("token")) {
    return <Login onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />
  }

  if (page === "login") {
    return <Login onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />
  }

  if (page === "register") {
    return <Register onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />
  }

  if (page === "dashboard") {
    return <Dashboard onNavigate={onNavigate} user={user} />
  }

  if (page === "interview") {
    return <InterviewRoom onNavigate={onNavigate} user={user} />
  }

  if (page === "report") {
    return <Report onNavigate={onNavigate} user={user} />
  }

  if (page === "analytics") {
    return <Analytics onNavigate={onNavigate} user={user} />
  }

  return <Login onNavigate={onNavigate} />
}

export default App
