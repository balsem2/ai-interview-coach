import { useState } from 'react';

import { registerUser } from "../services/api";

function SparkleIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.8c2.9 0 5 1.3 6.1 3.6 2.5.3 4.4 2.1 4.8 4.6.4 2.6-1 4.9-3.2 6.1-.5 2.5-2.6 4.4-5.1 4.9-2.5.5-4.8-.6-6.1-2.6-2.7-.1-4.9-1.8-5.6-4.3-.7-2.5.2-5 2.4-6.4.2-3.1 2.7-5.9 6.7-5.9Z" />
      <path d="M11.2 11.5 16 8.8l4.8 2.7v7L16 21.2l-4.8-2.7v-7Z" />
      <path d="M16 8.8v5.4l4.8 2.7M16 14.2l-4.8 2.7" />
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
