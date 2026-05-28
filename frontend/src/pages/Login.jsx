import { useState } from 'react';
import { loginUser } from "../services/api";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M15.6 3.8L18 12.5l8.7 2.4L18 17.3l-2.4 8.7-2.4-8.7-8.7-2.4 8.7-2.4 2.4-8.7Z" />
      <path d="M24.3 3.7l.8 3.1 3.1.8-3.1.8-.8 3.1-.8-3.1-3.1-.8 3.1-.8.8-3.1Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h16v11H4v-11Z" />
      <path d="m4.8 7.2 7.2 5.4 7.2-5.4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 10.5h13v8h-13v-8Z" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

function Login({ onNavigate, onAuthSuccess }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {

    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {

      const result = await loginUser({
        email,
        password
      });

      if (result.access_token) {
        localStorage.setItem("token", result.access_token);
        onAuthSuccess(result.user);

      } else {
        setError("Login failed");
      }

    } catch (error) {

      console.error(error);
      setError(error.message || "Server error");

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-labelledby="login-title">
        <div className="auth-brand">
          <div className="auth-logo">
            <SparkleIcon />
          </div>

          <h1 id="login-title">Welcome Back</h1>
          <p>Sign in to your AI Interview Simulator</p>
        </div>

        <form className="auth-card" onSubmit={handleLogin}>
          <label className="auth-field">
            <MailIcon />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <label className="auth-field">
            <LockIcon />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="auth-options">
            <label className="remember-option">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button className="auth-link" type="button">
              Forgot password?
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => onNavigate("register")}>
              Sign up
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Login;
