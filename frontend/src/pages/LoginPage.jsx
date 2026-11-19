import { useState } from 'react';
import { Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorMessage } from '../components/Ui.jsx';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="loading-screen">Restoring your session...</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-brand"><span className="brand-mark"><Activity size={21} /></span> opsdesk<span className="brand-ai">.ai</span></div>
        <div className="auth-story-copy">
          <span className="eyebrow light-eyebrow">OPERATIONS, IN FOCUS</span>
          <h1>Turn every ticket into a clear next step.</h1>
          <p>One workspace for your travel support team to triage, assign and resolve requests with confidence.</p>
        </div>
        <div className="auth-story-footer"><ShieldCheck size={16} /> Secure access for your organization</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to OpsDesk</h2>
          <p className="auth-subtitle">Use your organization account to continue.</p>
          <form onSubmit={handleSubmit} className="form-stack">
            <label>Email address
              <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            </label>
            <label>Password
              <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
            </label>
            <ErrorMessage error={error} />
            <button className="button button-primary button-wide" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'} {!submitting && <ArrowRight size={17} />}
            </button>
          </form>
          <p className="auth-footnote">Need an account? Ask your organization administrator to create one.</p>
        </div>
        <span className="auth-copyright">OpsDesk AI · Travel operations workspace</span>
      </section>
    </main>
  );
}
