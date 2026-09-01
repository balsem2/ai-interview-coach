import { useState } from 'react';
import { loginUser } from "../services/api";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.8c2.9 0 5 1.3 6.1 3.6 2.5.3 4.4 2.1 4.8 4.6.4 2.6-1 4.9-3.2 6.1-.5 2.5-2.6 4.4-5.1 4.9-2.5.5-4.8-.6-6.1-2.6-2.7-.1-4.9-1.8-5.6-4.3-.7-2.5.2-5 2.4-6.4.2-3.1 2.7-5.9 6.7-5.9Z" />
      <path d="M11.2 11.5 16 8.8l4.8 2.7v7L16 21.2l-4.8-2.7v-7Z" />
      <path d="M16 8.8v5.4l4.8 2.7M16 14.2l-4.8 2.7" />
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
        localStorage.setItem("refreshToken", result.refresh_token);
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
