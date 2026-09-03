import { useState } from "react";

import { requestPasswordReset } from "../services/api";


function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message || "Unable to request a password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-labelledby="forgot-password-title">
        <div className="auth-brand">
          <h1 id="forgot-password-title">Forgot Password</h1>
          <p>Enter your account email to receive a secure reset link.</p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <label className="auth-field">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="auth-switch">
            Remembered your password?{" "}
            <button type="button" onClick={() => onNavigate("login")}>Sign in</button>
          </p>
        </form>
      </section>
    </div>
  );
}

export default ForgotPassword;
