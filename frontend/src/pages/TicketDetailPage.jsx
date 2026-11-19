import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Pencil,
  Send,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { conversationsApi, ticketsApi, usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  EmptyState,
  ErrorMessage,
  ErrorState,
  LoadingBlock,
  PriorityTag,
  TicketStatus,
} from '../components/Ui.jsx';
import { formatRemainingTime, getSlaState } from '../utils/sla.js';

const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_SUPPLIER', 'RESOLVED', 'CLOSED'];
const categories = ['HOTEL', 'FLIGHT', 'CANCELLATION', 'REFUND', 'BOOKING', 'PAYMENT', 'OTHER'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const sources = ['MANUAL', 'EMAIL', 'PHONE', 'PORTAL', 'WHATSAPP'];

function displayDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function TicketEditForm({ ticket, saving, error, onSave, onCancel }) {
  const [form, setForm] = useState({
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    source: ticket.source,
    customerName: ticket.customerName || '',
    agency: ticket.agency || '',
    bookingReference: ticket.bookingReference || '',
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <section className="panel form-panel">
      <div className="panel-heading simple-heading"><div><h2>Edit ticket</h2><p>Changes are saved to this ticket.</p></div></div>
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <label>Subject<input required minLength={3} maxLength={200} value={form.subject} onChange={(event) => update('subject', event.target.value)} /></label>
        <label>Description<textarea required minLength={3} maxLength={5000} rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={(event) => update('priority', event.target.value)}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="form-row">
          <label>Source<select value={form.source} onChange={(event) => update('source', event.target.value)}>{sources.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Customer name<input maxLength={200} value={form.customerName} onChange={(event) => update('customerName', event.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>Agency<input maxLength={200} value={form.agency} onChange={(event) => update('agency', event.target.value)} /></label>
          <label>Booking reference<input maxLength={100} value={form.bookingReference} onChange={(event) => update('bookingReference', event.target.value)} /></label>
        </div>
        <ErrorMessage error={error} />
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
          <button className="button button-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </section>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const location = useLocation();
  const canAssign = ['ADMIN', 'MANAGER'].includes(user.role);
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [conversations, setConversations] = useState([]);
  const [related, setRelated] = useState([]);
  const [conversationType, setConversationType] = useState('INTERNAL_NOTE');
  const [conversationBody, setConversationBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(canAssign);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const [conversationsError, setConversationsError] = useState(null);
  const [relatedError, setRelatedError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [conversationError, setConversationError] = useState(null);
  const [success, setSuccess] = useState(location.state?.created ? 'Ticket created successfully.' : '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);
  const [approvingId, setApprovingId] = useState('');
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ticketsApi.get(token, id);
      setTicket(response.ticket);
      setStatus(response.ticket.status);
      setAssignee(response.ticket.assignedTo?._id || '');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const response = await ticketsApi.conversations(token, id);
      setConversations(response.items);
    } catch (requestError) {
      setConversationsError(requestError);
    } finally {
      setConversationsLoading(false);
    }
  }, [token, id]);

  const loadRelated = useCallback(async () => {
    setRelatedLoading(true);
    setRelatedError(null);
    try {
      const response = await ticketsApi.related(token, id);
      setRelated(response.related);
    } catch (requestError) {
      setRelatedError(requestError);
    } finally {
      setRelatedLoading(false);
    }
  }, [token, id]);

  useEffect(() => { loadTicket(); }, [loadTicket]);
  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { loadRelated(); }, [loadRelated]);

  useEffect(() => {
    if (!canAssign) return;
    let active = true;
    usersApi.list(token, { page: 1, limit: 100, isActive: 'true' })
      .then(({ items }) => { if (active) setAgents(items); })
      .catch((requestError) => { if (active) setUsersError(requestError); })
      .finally(() => { if (active) setUsersLoading(false); });
    return () => { active = false; };
  }, [token, canAssign]);

  async function saveStatus(event) {
    event.preventDefault();
    if (!ticket || status === ticket.status) return;
    setActionError(null);
    setSuccess('');
    setSavingStatus(true);
    try {
      const response = await ticketsApi.updateStatus(token, ticket._id, status);
      setTicket(response.ticket);
      setStatus(response.ticket.status);
      setSuccess('Ticket status updated.');
      loadConversations();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveAssignee(event) {
    event.preventDefault();
    if (!ticket || !assignee) return;
    setActionError(null);
    setSuccess('');
    setSavingAssignee(true);
    try {
      const response = await ticketsApi.assign(token, ticket._id, assignee);
      setTicket(response.ticket);
      setStatus(response.ticket.status);
      setAssignee(response.ticket.assignedTo?._id || '');
      setSuccess('Ticket assigned successfully.');
      loadConversations();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setSavingAssignee(false);
    }
  }

  async function saveConversation(event) {
    event.preventDefault();
    setConversationError(null);
    setSuccess('');
    setSavingConversation(true);
    try {
      await ticketsApi.addConversation(token, ticket._id, {
        type: conversationType,
        body: conversationBody,
      });
      setConversationBody('');
      setSuccess(conversationType === 'SUPPLIER_DRAFT'
        ? 'Supplier draft saved for review. It has not been sent.'
        : 'Internal note added.');
      await loadConversations();
    } catch (requestError) {
      setConversationError(requestError);
    } finally {
      setSavingConversation(false);
    }
  }

  async function decideDraft(conversation, decision) {
    setConversationError(null);
    setSuccess('');
    setApprovingId(conversation._id);
    try {
      const response = await conversationsApi.decide(token, conversation._id, decision);
      setConversations((items) => items.map((item) => item._id === conversation._id ? response.conversation : item));
      setSuccess(`Supplier draft ${decision.toLowerCase()}. No external message was sent.`);
    } catch (requestError) {
      setConversationError(requestError);
    } finally {
      setApprovingId('');
    }
  }

  async function saveTicket(updates) {
    setEditError(null);
    setSavingEdit(true);
    try {
      const response = await ticketsApi.update(token, ticket._id, updates);
      setTicket(response.ticket);
      setEditing(false);
      setSuccess('Ticket details updated.');
    } catch (requestError) {
      setEditError(requestError);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading ticket..." />;
  if (error) return <ErrorState message={error.message} onRetry={loadTicket} />;
  if (!ticket) return null;

  const canChangeStatus = user.role !== 'AGENT' || ticket.assignedTo?._id === user._id;
  const canEdit = user.role !== 'AGENT' || ticket.assignedTo?._id === user._id;
  const canApprove = ['ADMIN', 'MANAGER'].includes(user.role);
  const slaState = getSlaState(ticket);

  return (
    <div className="page-stack">
      <Link to="/tickets" className="back-link"><ArrowLeft size={16} /> Back to tickets</Link>
      {success && <div className="success-message page-success" role="status"><Check size={17} /> {success}</div>}
      {actionError && <div className="form-error" role="alert">{actionError.message}</div>}
      <div className="detail-layout">
        <div className="detail-main">
          {editing ? (
            <TicketEditForm
              ticket={ticket}
              saving={savingEdit}
              error={editError}
              onSave={saveTicket}
              onCancel={() => { setEditing(false); setEditError(null); }}
            />
          ) : (
            <section className="panel ticket-detail-panel">
              <div className="ticket-detail-top">
                <span className="ticket-number">{ticket.ticketNumber}</span>
                <div className="detail-badges"><PriorityTag priority={ticket.priority} /><TicketStatus status={ticket.status} /></div>
              </div>
              <div className="ticket-heading-actions">
                <h2 className="ticket-subject">{ticket.subject}</h2>
                {canEdit && <button className="button button-secondary button-small" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>}
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="detail-divider" />
              <div className="detail-facts">
                <div className="detail-fact"><span><Activity size={15} /> Category</span><strong>{ticket.category}</strong></div>
                <div className="detail-fact"><span><MapPin size={15} /> Team</span><strong>{ticket.assignedTeam?.replaceAll('_', ' ') || '—'}</strong></div>
                <div className="detail-fact"><span><UserRound size={15} /> Customer</span><strong>{ticket.customerName || 'Not provided'}</strong></div>
                <div className="detail-fact"><span>Agency</span><strong>{ticket.agency || 'Not provided'}</strong></div>
                <div className="detail-fact"><span>Booking reference</span><strong>{ticket.bookingReference || 'Not provided'}</strong></div>
                <div className="detail-fact"><span>Source</span><strong>{ticket.source || '—'}</strong></div>
                <div className="detail-fact"><span><CalendarDays size={15} /> Created</span><strong>{displayDate(ticket.createdAt)}</strong></div>
                <div className="detail-fact"><span>Last updated</span><strong>{displayDate(ticket.updatedAt)}</strong></div>
                <div className="detail-fact"><span><Clock3 size={15} /> SLA deadline</span><strong>{displayDate(ticket.slaDeadline)}</strong></div>
                <div className="detail-fact"><span>SLA status</span><strong>{slaState.replaceAll('_', ' ')} · {formatRemainingTime(ticket.slaDeadline)}</strong></div>
                <div className="detail-fact"><span>Created by</span><strong>{ticket.createdBy?.name || '—'}</strong></div>
                <div className="detail-fact"><span>Assigned to</span><strong>{ticket.assignedTo?.name || 'Unassigned'}</strong></div>
              </div>
            </section>
          )}

          <section className="panel intelligence-panel">
            <div className="panel-heading simple-heading"><div><h2>Conversation & activity</h2><p>Internal notes, supplier drafts and ticket history</p></div></div>
            <form onSubmit={saveConversation} className="form-stack conversation-form">
              <label>Entry type
                <select value={conversationType} onChange={(event) => setConversationType(event.target.value)}>
                  <option value="INTERNAL_NOTE">Internal note</option>
                  <option value="SUPPLIER_DRAFT">Supplier communication draft</option>
                </select>
              </label>
              <label>{conversationType === 'SUPPLIER_DRAFT' ? 'Draft message' : 'Internal note'}
                <textarea required minLength={1} maxLength={5000} rows={3} value={conversationBody} onChange={(event) => setConversationBody(event.target.value)} placeholder="Write an internal note or draft for review..." />
              </label>
              {conversationType === 'SUPPLIER_DRAFT' && (
                <p className="field-hint">Saving a draft does not send it to a supplier.</p>
              )}
              <ErrorMessage error={conversationError} />
              <button className="button button-primary" disabled={savingConversation || !conversationBody.trim()}>
                <Send size={15} /> {savingConversation ? 'Saving...' : conversationType === 'SUPPLIER_DRAFT' ? 'Save draft' : 'Add note'}
              </button>
            </form>
            {conversationsLoading ? <LoadingBlock label="Loading conversation history..." /> : conversationsError ? (
              <ErrorState message={conversationsError.message} onRetry={loadConversations} />
            ) : conversations.length === 0 ? (
              <EmptyState title="No activity yet" message="Notes and ticket status or assignment changes will appear here." />
            ) : (
              <div className="conversation-list">
                {conversations.map((item) => (
                  <article className={`conversation-item conversation-${item.type?.toLowerCase().replaceAll('_', '-')}`} key={item._id}>
                    <div className="conversation-meta">
                      <strong>{item.type?.replaceAll('_', ' ')}</strong>
                      <span>{item.author?.name || 'System'} · {displayDate(item.createdAt)}</span>
                    </div>
                    {item.type === 'SUPPLIER_DRAFT' && <span className={`approval-pill approval-${item.approvalStatus?.toLowerCase()}`}>{item.approvalStatus || 'PENDING'}</span>}
                    <p>{item.body}</p>
                    {item.type === 'SUPPLIER_DRAFT' && item.approvalStatus !== 'PENDING' && (
                      <small className="approval-details">
                        {item.approvedBy?.name ? `${item.approvalStatus.toLowerCase()} by ${item.approvedBy.name}` : `Draft ${item.approvalStatus?.toLowerCase()}`}
                        {item.approvedAt ? ` · ${displayDate(item.approvedAt)}` : ''}
                        {' · Not sent externally'}
                      </small>
                    )}
                    {item.type === 'SUPPLIER_DRAFT' && item.approvalStatus === 'PENDING' && canApprove && (
                      <div className="conversation-actions">
                        <button className="button button-primary button-small" disabled={Boolean(approvingId)} onClick={() => decideDraft(item, 'APPROVED')}>
                          {approvingId === item._id ? 'Saving...' : 'Approve draft'}
                        </button>
                        <button className="button button-secondary button-small" disabled={Boolean(approvingId)} onClick={() => decideDraft(item, 'REJECTED')}>Reject</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel intelligence-panel">
            <div className="panel-heading simple-heading"><div><h2>Related tickets</h2><p>Matches returned by the ticket intelligence API</p></div></div>
            {relatedLoading ? <LoadingBlock label="Finding related tickets..." /> : relatedError ? (
              <ErrorState message={relatedError.message} onRetry={loadRelated} />
            ) : related.length === 0 ? (
              <EmptyState title="No related tickets found" message="There are no matching tickets in the current visible scope." />
            ) : (
              <div className="related-list">
                {related.map(({ ticket: match, score, reasons }) => (
                  <Link className="related-ticket" to={`/tickets/${match._id}`} key={match._id}>
                    <div><strong>{match.ticketNumber} · {match.subject}</strong><span>{match.category} · {match.status?.replaceAll('_', ' ')} · {match.priority}</span></div>
                    <small>{(reasons || []).join(' · ') || `Match score ${score}`}</small>
                    <span className="related-context">{[match.bookingReference, match.agency].filter(Boolean).join(' · ') || 'No booking or agency context'}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="detail-aside">
          <section className="panel action-panel">
            <div className="panel-heading simple-heading"><div><h2>Update status</h2><p>Changes are recorded in the ticket history.</p></div></div>
            {!canChangeStatus ? <p className="field-hint">Agents can change status only for tickets assigned to them.</p> : (
              <form onSubmit={saveStatus} className="form-stack">
                <label>Status
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    {statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
                <button className="button button-primary button-wide" disabled={savingStatus || status === ticket.status}>
                  {savingStatus ? 'Saving...' : 'Save status'}
                </button>
              </form>
            )}
          </section>
          {canAssign && (
            <section className="panel action-panel">
              <div className="panel-heading simple-heading"><div><h2>Assign ticket</h2><p>Choose an active team member.</p></div></div>
              {usersLoading ? <LoadingBlock label="Loading team members..." /> : usersError ? <div className="inline-error" role="alert">{usersError.message}</div> : (
                <form onSubmit={saveAssignee} className="form-stack">
                  <label>Assignee
                    <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                      <option value="">Select a team member</option>
                      {agents.map((member) => <option value={member._id} key={member._id}>{member.name} · {member.role}</option>)}
                    </select>
                  </label>
                  <button className="button button-secondary button-wide" disabled={savingAssignee || !assignee || assignee === ticket.assignedTo?._id}>
                    {savingAssignee ? 'Assigning...' : 'Assign ticket'}
                  </button>
                </form>
              )}
            </section>
          )}
          <section className="assignment-summary">
            <div className="avatar">{ticket.assignedTo?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—'}</div>
            <div><span>Currently assigned to</span><strong>{ticket.assignedTo?.name || 'Unassigned'}</strong></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
