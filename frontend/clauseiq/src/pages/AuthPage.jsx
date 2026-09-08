import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

const ROLES = [
  { value: "business_user", label: "Business user" },
  { value: "legal_reviewer", label: "Legal reviewer" },
  { value: "admin", label: "Admin" },
];

const HOME_BY_ROLE = {
  business_user: "/business",
  legal_reviewer: "/reviewer/queue",
  admin: "/admin/analytics",
};

export default function AuthPage() {
  const [signUpActive, setSignUpActive] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  function getErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).join(", ");
  }
  return fallback;
}

  function goHome(user) {
    navigate(HOME_BY_ROLE[user.role] || "/");
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(loginEmail, loginPassword);
      goHome(user);
    } catch (err) {
  setError(
    getErrorMessage(
      err,
      "Couldn't log in. Check your email and password."
    )
  );
}
finally {
      setSubmitting(false);
    }
  }

  

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await register(regEmail, regPassword, regRole);
      goHome(user);
    } catch (err) {
  setError(
    getErrorMessage(
      err,
      "Couldn't create the account. Try a different email."
    )
  );
}
finally {
      setSubmitting(false);
    }
  }

  function switchTo(next) {
    setError("");
    setSignUpActive(next === "signup");
  }

  return (
    <div className={`auth-container ${signUpActive ? "is-active" : ""}`}>
      {/* Sign-up form */}
      <div className="auth-form-panel auth-form-panel--signup">
        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="auth-brand">ClauseIQ</div>
          <h1>Create account</h1>
          <p className="auth-form__hint">
            Set up access to review, route, and track your contracts.
          </p>

          <input
            type="email"
            placeholder="Work email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <select
  value={regRole}
  onChange={(e) => setRegRole(e.target.value)}
  required
>
  <option value="" disabled>
    Select role
  </option>

  {ROLES.map((r) => (
    <option key={r.value} value={r.value}>
      {r.label}
    </option>
  ))}
</select>

          {signUpActive && error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : "Sign up"}
          </button>

          <button
            type="button"
            className="auth-mobile-switch"
            onClick={() => switchTo("signin")}
          >
            Already have an account? Sign in
          </button>
        </form>
      </div>

      {/* Sign-in form */}
      <div className="auth-form-panel auth-form-panel--signin">
        <form className="auth-form" onSubmit={handleLoginSubmit}>
          <div className="auth-brand">ClauseIQ</div>
          <h1>Sign in</h1>
          <p className="auth-form__hint">
            Welcome back. Enter your details to continue.
          </p>

          <input
            type="email"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {!signUpActive && error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : "Sign in"}
          </button>

          <button
            type="button"
            className="auth-mobile-switch"
            onClick={() => switchTo("signup")}
          >
            New here? Create an account
          </button>
        </form>
      </div>

      {/* Sliding color overlay */}
      <div className="auth-overlay-container">
        <div className="auth-overlay">
          <div className="auth-overlay-panel auth-overlay-panel--left">
            <div className="auth-brand auth-brand--light">ClauseIQ</div>
            <h1>Welcome back</h1>
            <p>Sign in to pick up your contract reviews where you left off.</p>
            <button type="button" onClick={() => switchTo("signin")}>
              Sign in
            </button>
          </div>
          <div className="auth-overlay-panel auth-overlay-panel--right">
            <div className="auth-brand auth-brand--light">ClauseIQ</div>
            <h1>New to ClauseIQ</h1>
            <p>
              Create an account to start automating contract intake and
              review.
            </p>
            <button type="button" onClick={() => switchTo("signup")}>
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}