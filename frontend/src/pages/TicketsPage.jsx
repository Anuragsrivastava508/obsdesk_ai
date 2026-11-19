import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ticketsApi, usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingBlock, PriorityTag, TicketStatus } from '../components/Ui.jsx';

export default function TicketsPage() {
  const { token, user } = useAuth();
  const canAssign = ['ADMIN', 'MANAGER'].includes(user.role);
  const [tickets, setTickets] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [assigneesError, setAssigneesError] = useState(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ticketsApi.list(token, {
        page,
        limit: 20,
        search: search.trim(),
        status,
        priority,
        category,
        assignedTo,
      });
      setTickets(response.items);
      setPagination({ total: response.total, totalPages: response.totalPages });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [token, search, status, priority, category, assignedTo, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canAssign) return;
    let active = true;
    usersApi.list(token, { page: 1, limit: 100, isActive: 'true' })
      .then(({ items }) => { if (active) setAssignees(items); })
      .catch((requestError) => { if (active) setAssigneesError(requestError); });
    return () => { active = false; };
  }, [token, canAssign]);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(query);
    setPage(1);
  }

  function changeStatus(value) {
    setStatus(value);
    setPage(1);
  }

  function clearFilters() {
    setQuery('');
    setSearch('');
    setStatus('');
    setPriority('');
    setCategory('');
    setAssignedTo('');
    setPage(1);
  }

  const hasFilters = Boolean(search || status || priority || category || assignedTo);

  return (
    <div className="page-stack">
      <section className="list-toolbar">
        <form className="search-form" onSubmit={submitSearch}>
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket number or booking reference" aria-label="Search tickets" />
          <button type="submit" className="button button-secondary button-small">Search</button>
        </form>
        <label className="filter-control"><SlidersHorizontal size={16} /><select value={status} onChange={(event) => changeStatus(event.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="WAITING_FOR_SUPPLIER">Waiting for supplier</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select></label>
        <label className="filter-control"><select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} aria-label="Filter by priority">
          <option value="">All priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select></label>
        <label className="filter-control"><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="Filter by category">
          <option value="">All categories</option>
          {['HOTEL', 'FLIGHT', 'CANCELLATION', 'REFUND', 'BOOKING', 'PAYMENT', 'OTHER'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </select></label>
        {canAssign && <label className="filter-control"><select value={assignedTo} onChange={(event) => { setAssignedTo(event.target.value); setPage(1); }} aria-label="Filter by assignee">
          <option value="">All assignees</option>
          {assignees.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
        </select></label>}
        {hasFilters && <button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button>}
        <Link className="button button-primary" to="/tickets/new"><Plus size={17} /> New ticket</Link>
      </section>
      {assigneesError && <div className="inline-error" role="alert">Assignee filter unavailable: {assigneesError.message}</div>}
      <section className="panel ticket-list-panel">
        <div className="panel-heading panel-heading-row">
          <div><h2>All tickets</h2><p>{loading ? 'Retrieving tickets...' : `${pagination.total} result${pagination.total === 1 ? '' : 's'} in your ticket scope`}</p></div>
        </div>
        {loading ? <LoadingBlock label="Loading tickets..." /> : error ? <ErrorState message={error.message} onRetry={load} /> : tickets.length === 0 ? (
          <EmptyState title="No matching tickets" message="Try a different search or status filter, or create a ticket." action={<Link className="button button-primary button-small" to="/tickets/new">Create ticket</Link>} />
        ) : (
          <div className="ticket-table-wrap">
            <table className="ticket-table">
              <thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Created</th></tr></thead>
              <tbody>{tickets.map((ticket) => (
                <tr key={ticket._id}>
                  <td><Link to={`/tickets/${ticket._id}`} className="ticket-title-link"><strong>{ticket.subject}</strong><small>{ticket.ticketNumber}</small></Link></td>
                  <td><span className="category-label">{ticket.category?.replaceAll('_', ' ')}</span></td>
                  <td><PriorityTag priority={ticket.priority} /></td>
                  <td><TicketStatus status={ticket.status} /></td>
                  <td>{ticket.assignedTo?.name || <span className="muted-text">Unassigned</span>}</td>
                  <td className="date-cell">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {pagination.totalPages}</span>
            <div>
              <button className="button button-secondary button-small" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={14} /> Previous</button>
              <button className="button button-secondary button-small" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
