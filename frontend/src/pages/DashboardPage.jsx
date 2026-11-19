import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Ticket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, ticketsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorState, LoadingBlock, PriorityTag, TicketStatus } from '../components/Ui.jsx';

const metricConfig = [
  { key: 'total', label: 'Total tickets', icon: Ticket, color: 'blue' },
  { key: 'open', label: 'Open', icon: Clock3, color: 'amber' },
  { key: 'inProgress', label: 'In progress', icon: ArrowUpRight, color: 'violet' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'green' },
  { key: 'critical', label: 'Critical priority', icon: AlertTriangle, color: 'rose' },
  { key: 'slaBreached', label: 'SLA breached', icon: AlertTriangle, color: 'rose' },
];

const chartColors = ['#4169e1', '#31a987', '#f0a94a', '#8e74d6', '#e87979', '#46a4bd', '#8da2b8'];

function AnalyticsList({ title, data, emptyLabel }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return (
    <section className="panel analytics-panel">
      <div className="panel-heading simple-heading"><div><h2>{title}</h2><p>Breakdown from your live ticket records</p></div></div>
      {rows.length === 0 ? <p className="muted-empty">{emptyLabel}</p> : (
        <div className="bar-list">
          {rows.map(([label, value], index) => (
            <div className="bar-row" key={label}>
              <div className="bar-label"><span>{label.replaceAll('_', ' ')}</span><strong>{value}</strong></div>
              <div className="bar-track"><span style={{ width: `${(value / max) * 100}%`, background: chartColors[index % chartColors.length] }} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, analyticsResult, workloadResult, ticketsResult] = await Promise.all([
        dashboardApi.summary(token),
        dashboardApi.analytics(token),
        dashboardApi.workload(token),
        ticketsApi.list(token, { page: 1, limit: 5 }),
      ]);
      setData({
        summary: summaryResult.summary,
        analytics: analyticsResult.analytics,
        workload: workloadResult.workload,
        tickets: ticketsResult.items,
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock label="Loading live operations data..." />;
  if (error) return <ErrorState message={error.message} onRetry={load} />;

  const summary = data.summary;
  return (
    <div className="page-stack">
      <section className="welcome-strip">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2>Good to see you, {user?.name?.split(' ')[0]}.</h2>
          <p>Here is the latest view of your team's support queue.</p>
        </div>
        <div className="welcome-note"><span className="online-dot" /> Metrics are synced with the API</div>
      </section>

      <section className="metric-grid" aria-label="Ticket metrics">
        {metricConfig.map(({ key, label, icon: Icon, color }) => (
          <article className="metric-card" key={key}>
            <div className={`metric-icon metric-${color}`}><Icon size={19} /></div>
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{summary[key]}</strong>
            <span className="metric-caption">Current visible ticket scope</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid analytics-grid">
        <AnalyticsList title="Tickets by status" data={data.analytics.byStatus} emptyLabel="No status data yet." />
        <AnalyticsList title="Tickets by priority" data={data.analytics.byPriority} emptyLabel="No priority data yet." />
        <AnalyticsList title="Tickets by category" data={data.analytics.byCategory} emptyLabel="No category data yet." />
      </section>

      <section className="dashboard-grid lower-grid">
        <div className="panel recent-panel">
          <div className="panel-heading panel-heading-row">
            <div><h2>Recent tickets</h2><p>Newest requests in your queue</p></div>
            <Link to="/tickets" className="text-link">View all <ArrowRight size={15} /></Link>
          </div>
          {data.tickets.length === 0 ? (
            <EmptyState title="No tickets yet" message="Create the first ticket to start tracking work." action={<Link className="button button-primary button-small" to="/tickets/new">Create ticket</Link>} />
          ) : (
            <div className="ticket-table-wrap">
              <table className="ticket-table recent-table">
                <thead><tr><th>Ticket</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>{data.tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td><Link to={`/tickets/${ticket._id}`} className="ticket-title-link"><strong>{ticket.subject}</strong><small>{ticket.ticketNumber}</small></Link></td>
                    <td><PriorityTag priority={ticket.priority} /></td>
                    <td><TicketStatus status={ticket.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
        <section className="panel workload-panel">
          <div className="panel-heading simple-heading"><div><h2>Agent workload</h2><p>Active assigned tickets</p></div></div>
          {data.workload.length === 0 ? (
            <div className="workload-empty"><ArrowDownRight size={20} /><span>No active assigned work right now.</span></div>
          ) : (
            <div className="workload-list">
              {data.workload.slice(0, 5).map((agent) => (
                <div className="workload-row" key={agent.agentId}>
                  <div className="avatar avatar-small">{agent.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
                  <div className="workload-person"><strong>{agent.name}</strong><span>{agent.role}</span></div>
                  <span className="workload-count">{agent.activeTickets}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
