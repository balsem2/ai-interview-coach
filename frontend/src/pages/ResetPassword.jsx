import { useState } from "react";

import { resetPassword } from "../services/api";


function ResetPassword({ onNavigate, token }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(token ? "" : "This reset link is missing its token.");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(token, password);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setSuccess(result.message);
      setPassword("");
      setConfirmation("");
    } catch (requestError) {
      setError(requestError.message || "Unable to reset the password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-labelledby="reset-password-title">
        <div className="auth-brand">
          <h1 id="reset-password-title">Choose a New Password</h1>
          <p>Use at least 8 characters, then sign in again.</p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <label className="auth-field">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              disabled={!token || Boolean(success)}
            />
          </label>

          <label className="auth-field">
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              disabled={!token || Boolean(success)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          {!success && (
            <button className="auth-submit" type="submit" disabled={isSubmitting || !token}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          )}

          <p className="auth-switch">
            <button type="button" onClick={() => onNavigate("login")}>Return to sign in</button>
          </p>
        </form>
      </section>
    </div>
  );
}

export default ResetPassword;
