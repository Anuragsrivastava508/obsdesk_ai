import { useState } from 'react';
import { ArrowLeft, CheckCircle2, TicketPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ticketsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorMessage } from '../components/Ui.jsx';

const initialForm = {
  subject: '',
  description: '',
  category: 'OTHER',
  priority: 'MEDIUM',
  source: 'MANUAL',
  customerName: '',
  agency: '',
  bookingReference: '',
};

export default function NewTicketPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { ticket } = await ticketsApi.create(token, form);
      navigate(`/tickets/${ticket._id}`, { replace: true, state: { created: true } });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <Link to="/tickets" className="back-link"><ArrowLeft size={16} /> Back to tickets</Link>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div className="panel-icon"><TicketPlus size={20} /></div>
          <div><h2>New operations ticket</h2><p>Ticket routing and SLA are assigned automatically by the API.</p></div>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <label>Subject
            <input required minLength={3} maxLength={200} value={form.subject} onChange={(event) => update('subject', event.target.value)} placeholder="Briefly describe the issue" />
          </label>
          <label>Description
            <textarea required minLength={3} maxLength={5000} rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Add the details your team needs to resolve this request." />
          </label>
          <div className="form-row">
            <label>Category
              <select value={form.category} onChange={(event) => update('category', event.target.value)}>
                {['HOTEL', 'FLIGHT', 'CANCELLATION', 'REFUND', 'BOOKING', 'PAYMENT', 'OTHER'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>Source
              <select value={form.source} onChange={(event) => update('source', event.target.value)}>
                {['MANUAL', 'EMAIL', 'PHONE', 'PORTAL', 'WHATSAPP'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>Customer name
              <input maxLength={200} value={form.customerName} onChange={(event) => update('customerName', event.target.value)} placeholder="Optional" />
            </label>
          </div>
          <div className="form-row">
            <label>Agency
              <input maxLength={200} value={form.agency} onChange={(event) => update('agency', event.target.value)} placeholder="Optional" />
            </label>
            <label>Booking reference
              <input maxLength={100} value={form.bookingReference} onChange={(event) => update('bookingReference', event.target.value)} placeholder="Optional" />
            </label>
          </div>
          <ErrorMessage error={error} />
          <div className="form-actions">
            <Link to="/tickets" className="button button-secondary">Cancel</Link>
            <button className="button button-primary" disabled={submitting}>{submitting ? 'Creating ticket...' : <><CheckCircle2 size={16} /> Create ticket</>}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
