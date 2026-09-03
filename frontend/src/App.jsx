import { lazy, Suspense, useEffect, useState } from "react";

import { getCurrentUser } from "./services/api";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));
const Report = lazy(() => import("./pages/Report"));
const Analytics = lazy(() => import("./pages/Analytics"));
const History = lazy(() => import("./pages/History"));

const protectedPages = ["dashboard", "interview", "history", "report", "analytics"];

function App() {
  const [passwordResetToken] = useState(() => new URLSearchParams(window.location.search).get("reset_token"));
  const [page, setPage] = useState(() => {
    if (new URLSearchParams(window.location.search).get("reset_token")) return "reset-password";
    return localStorage.getItem("token") ? "dashboard" : "login";
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (passwordResetToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [passwordResetToken]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setUser(null);
        setPage("login");
      });
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => { setUser(null); setPage("login"); };
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  const onNavigate = (newPage) => {
    if (newPage === "logout") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      setPage("login");
      return;
    }
    if (protectedPages.includes(newPage) && !localStorage.getItem("token")) {
      setPage("login");
      return;
    }
    setPage(newPage);
  };

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    localStorage.setItem("user", JSON.stringify(authUser));
    setPage("dashboard");
  };

  let content;
  if (protectedPages.includes(page) && !localStorage.getItem("token")) content = <Login onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />;
  else if (page === "login") content = <Login onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />;
  else if (page === "register") content = <Register onNavigate={onNavigate} />;
  else if (page === "forgot-password") content = <ForgotPassword onNavigate={onNavigate} />;
  else if (page === "reset-password") content = <ResetPassword onNavigate={onNavigate} token={passwordResetToken} />;
  else if (page === "dashboard") content = <Dashboard onNavigate={onNavigate} user={user} />;
  else if (page === "interview") content = <InterviewRoom onNavigate={onNavigate} user={user} />;
  else if (page === "history") content = <History onNavigate={onNavigate} user={user} />;
  else if (page === "report") content = <Report onNavigate={onNavigate} user={user} />;
  else if (page === "analytics") content = <Analytics onNavigate={onNavigate} user={user} />;
  else content = <Login onNavigate={onNavigate} onAuthSuccess={handleAuthSuccess} />;

  return <Suspense fallback={<div className="page-header"><p>Loading...</p></div>}>{content}</Suspense>;
}

export default App;
