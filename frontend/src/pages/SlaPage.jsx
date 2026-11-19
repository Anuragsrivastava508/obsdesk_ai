import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { slaApi, ticketsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingBlock, PriorityTag, TicketStatus } from '../components/Ui.jsx';
import { formatRemainingTime, getSlaState } from '../utils/sla.js';

const states = ['ALL', 'BREACHED', 'APPROACHING', 'ON_TRACK'];
const priorities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const stateLabels = {
  BREACHED: 'Breached',
  APPROACHING: 'At risk',
  ON_TRACK: 'On track',
};

function SlaCount({ label, value, icon: Icon, tone }) {
  return (
    <article className="metric-card sla-metric">
      <div className={`metric-icon metric-${tone}`}><Icon size={19} /></div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value ?? '—'}</strong>
      <span className="metric-caption">Tickets in your visible scope</span>
    </article>
  );
}

export default function SlaPage() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [breachedIds, setBreachedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [slaState, setSlaState] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assigneeFilter = user.role === 'AGENT' ? { assignedTo: user._id } : {};
      const [overviewResponse, firstPage, firstBreachedPage] = await Promise.all([
        slaApi.overview(token),
        ticketsApi.list(token, { page: 1, limit: 100, ...assigneeFilter }),
        slaApi.breached(token, { page: 1, limit: 100 }),
      ]);
      const allTickets = [...firstPage.items];
      const allBreached = [...firstBreachedPage.items];
      for (let startPage = 2; startPage <= firstPage.totalPages; startPage += 5) {
        const pageNumbers = Array.from(
          { length: Math.min(5, firstPage.totalPages - startPage + 1) },
          (_, index) => startPage + index
        );
        const nextPages = await Promise.all(pageNumbers.map((ticketPage) => (
          ticketsApi.list(token, { page: ticketPage, limit: 100, ...assigneeFilter })
        )));
        nextPages.forEach((ticketPage) => allTickets.push(...ticketPage.items));
      }
      for (let startPage = 2; startPage <= firstBreachedPage.totalPages; startPage += 5) {
        const pageNumbers = Array.from(
          { length: Math.min(5, firstBreachedPage.totalPages - startPage + 1) },
          (_, index) => startPage + index
        );
        const nextPages = await Promise.all(pageNumbers.map((ticketPage) => (
          slaApi.breached(token, { page: ticketPage, limit: 100 })
        )));
        nextPages.forEach((ticketPage) => allBreached.push(...ticketPage.items));
      }
      setOverview(overviewResponse.overview);
      setTickets(allTickets);
      setBreachedIds(new Set(allBreached.map((ticket) => ticket._id)));
      setPage(1);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [token, user.role, user._id]);

  useEffect(() => { load(); }, [load]);

  const filteredTickets = tickets.filter((ticket) => (
    (slaState === 'ALL' || (slaState === 'BREACHED'
      ? breachedIds.has(ticket._id)
      : getSlaState(ticket) === slaState))
    && (priority === 'ALL' || ticket.priority === priority)
  ));
  const totalPages = Math.ceil(filteredTickets.length / 20);
  const pageTickets = filteredTickets.slice((page - 1) * 20, page * 20);

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="page-stack">
      <section className="metric-grid sla-metric-grid" aria-label="SLA overview">
        <SlaCount label="On track" value={overview?.ON_TRACK} icon={CheckCircle2} tone="green" />
        <SlaCount label="At risk" value={overview?.APPROACHING} icon={Clock3} tone="amber" />
        <SlaCount label="Breached" value={overview?.BREACHED} icon={AlertTriangle} tone="rose" />
      </section>
      <section className="panel ticket-list-panel">
        <div className="panel-heading panel-heading-row">
          <div><h2>SLA tickets</h2><p>{loading ? 'Retrieving SLA tickets...' : `${filteredTickets.length} ticket${filteredTickets.length === 1 ? '' : 's'} match these filters`}</p></div>
        </div>
        <div className="list-toolbar sla-toolbar">
          <label className="filter-control"><span>SLA state</span><select value={slaState} onChange={(event) => changeFilter(setSlaState, event.target.value)}>
            {states.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All SLA states' : stateLabels[value]}</option>)}
          </select></label>
          <label className="filter-control"><span>Priority</span><select value={priority} onChange={(event) => changeFilter(setPriority, event.target.value)}>
            {priorities.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All priorities' : value}</option>)}
          </select></label>
        </div>
        {loading ? <LoadingBlock label="Loading SLA tickets..." /> : error ? <ErrorState message={error.message} onRetry={load} /> : filteredTickets.length === 0 ? (
          <EmptyState title="No tickets match these filters" message="Change the SLA state or priority filter, or check another page." />
        ) : (
          <div className="ticket-table-wrap">
            <table className="ticket-table">
              <thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>SLA state</th><th>Assigned to</th><th>Deadline</th><th>Remaining</th></tr></thead>
              <tbody>{pageTickets.map((ticket) => {
                const state = getSlaState(ticket);
                return (
                  <tr key={ticket._id}>
                    <td><Link to={`/tickets/${ticket._id}`} className="ticket-title-link"><strong>{ticket.subject}</strong><small>{ticket.ticketNumber}</small></Link></td>
                    <td><PriorityTag priority={ticket.priority} /></td>
                    <td><TicketStatus status={ticket.status} /></td>
                    <td><span className={`sla-state sla-${state.toLowerCase()}`}>{stateLabels[state]}</span></td>
                    <td>{ticket.assignedTo?.name || <span className="muted-text">Unassigned</span>}</td>
                    <td className="date-cell">{ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleString() : '—'}</td>
                    <td className={state === 'BREACHED' ? 'sla-overdue' : ''}>{ticket.slaDeadline ? formatRemainingTime(ticket.slaDeadline) : '—'}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
        {!loading && !error && totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button className="button button-secondary button-small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <button className="button button-secondary button-small" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
