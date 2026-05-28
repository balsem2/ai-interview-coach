import { useState } from 'react';

import { registerUser } from "../services/api";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M15.6 3.8L18 12.5l8.7 2.4L18 17.3l-2.4 8.7-2.4-8.7-8.7-2.4 8.7-2.4 2.4-8.7Z" />
      <path d="M24.3 3.7l.8 3.1 3.1.8-3.1.8-.8 3.1-.8-3.1-3.1-.8 3.1-.8.8-3.1Z" />
    </svg>
  );
}

function Register({ onNavigate }) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const createdUser = await registerUser({
        fullname,
        email,
        password
      });

      setFullname('');
      setEmail('');
      setPassword('');
      setSuccess(`Account created for ${createdUser.email}. You can sign in now.`);
    } catch (error) {
      console.error(error);
      setError(error.message || "Server error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-labelledby="register-title">
        <div className="auth-brand">
          <div className="auth-logo">
            <SparkleIcon />
          </div>

          <h1 id="register-title">Create Account</h1>
          <p>Start practicing with your AI Interview Simulator</p>
        </div>

        <form className="auth-card" onSubmit={handleRegister}>
          <label className="auth-field">
            <input
              type="text"
              placeholder="Full name"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="auth-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" onClick={() => onNavigate("login")}>
              Sign in
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

export default Register;
