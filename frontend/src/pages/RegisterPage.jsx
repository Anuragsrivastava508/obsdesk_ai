import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Plus, UserRoundPlus } from 'lucide-react';
import { usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, ErrorMessage, ErrorState, LoadingBlock } from '../components/Ui.jsx';

const roles = ['AGENT', 'MANAGER', 'ADMIN'];
const initialForm = { name: '', email: '', password: '', role: 'AGENT' };

export default function RegisterPage() {
  const { token, user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({ name: '', role: 'AGENT', isActive: true, password: '' });
  const [error, setError] = useState(null);
  const [listError, setListError] = useState(null);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const { items, total, totalPages } = await usersApi.list(token, { page, limit: 20 });
      setMembers(items);
      setPagination({ total, totalPages });
    } catch (requestError) {
      setListError(requestError);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError(null);
    setSuccess('');
    setSubmitting(true);
    try {
      const { user: created } = await usersApi.create(token, form);
      setSuccess(`${created.name} was added to your organization.`);
      setForm(initialForm);
      setShowCreateForm(false);
      await loadMembers();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(member) {
    setEditingId(member._id);
    setEditForm({ name: member.name, role: member.role, isActive: member.isActive, password: '' });
    setError(null);
    setSuccess('');
  }

  async function saveMember(event) {
    event.preventDefault();
    setError(null);
    setSuccess('');
    setSavingEdit(true);
    try {
      const { user: updated } = await usersApi.update(token, editingId, {
        name: editForm.name,
        role: editForm.role,
        isActive: editForm.isActive,
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      setMembers((current) => current.map((member) => member._id === editingId ? updated : member));
      setEditingId('');
      setSuccess(`${updated.name} was updated.`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="page-stack">
      {success && <div className="success-message" role="status"><CheckCircle2 size={17} /> {success}</div>}
      {error && <ErrorMessage error={error} />}
      <section className="panel ticket-list-panel team-panel">
        <div className="panel-heading panel-heading-row">
          <div><h2>Organization team</h2><p>{loading ? 'Retrieving team members...' : `${pagination.total} member${pagination.total === 1 ? '' : 's'} · organization-scoped`}</p></div>
          {isAdmin && <button className="button button-primary" onClick={() => { setShowCreateForm((value) => !value); setError(null); }}><Plus size={16} /> Add member</button>}
        </div>
        {isAdmin && showCreateForm && (
          <form onSubmit={handleCreate} className="team-create-form form-stack">
            <div className="panel-heading">
              <div className="panel-icon"><UserRoundPlus size={20} /></div>
              <div><h2>Add a team member</h2><p>Create an account scoped to your organization.</p></div>
            </div>
            <div className="form-row">
              <label>Full name<input required minLength={2} maxLength={100} value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Jordan Lee" /></label>
              <label>Email address<input type="email" required value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="jordan@company.com" /></label>
            </div>
            <div className="form-row">
              <label>Temporary password<input type="password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder="At least 8 characters" /></label>
              <label>Role<select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>{roles.map((role) => <option value={role} key={role}>{role}</option>)}</select></label>
            </div>
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => { setShowCreateForm(false); setForm(initialForm); }}>Cancel</button>
              <button className="button button-primary" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
            </div>
          </form>
        )}
        {loading ? <LoadingBlock label="Loading team members..." /> : listError ? <ErrorState message={listError.message} onRetry={loadMembers} /> : members.length === 0 ? (
          <EmptyState title="No team members found" message="There are no members in this organization." />
        ) : (
          <div className="ticket-table-wrap">
            <table className="ticket-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account</th>{isAdmin && <th>Actions</th>}</tr></thead>
              <tbody>{members.map((member) => (
                <tr key={member._id}>
                  {editingId === member._id ? (
                    <>
                      <td><input form={`member-form-${member._id}`} className="table-input" required minLength={2} maxLength={100} value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /></td>
                      <td>{member.email}</td>
                      <td><select form={`member-form-${member._id}`} className="table-input" value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}>{roles.map((role) => <option key={role}>{role}</option>)}</select></td>
                      <td><label className="active-toggle"><input form={`member-form-${member._id}`} type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label></td>
                      <td><form id={`member-form-${member._id}`} className="inline-form-actions" onSubmit={saveMember}>
                        <input className="table-input" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={editForm.password} onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))} placeholder="New password (optional)" aria-label="New password (optional)" />
                        <button className="button button-primary button-small" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</button>
                        <button type="button" className="button button-secondary button-small" onClick={() => setEditingId('')}>Cancel</button>
                      </form></td>
                    </>
                  ) : (
                    <>
                      <td><strong>{member.name}</strong></td>
                      <td>{member.email}</td>
                      <td>{member.role}</td>
                      <td><span className={`member-state ${member.isActive ? 'member-active' : 'member-inactive'}`}>{member.isActive ? 'Active' : 'Inactive'}</span></td>
                      {isAdmin && <td><button className="button button-secondary button-small" onClick={() => startEdit(member)}><Pencil size={13} /> Edit</button></td>}
                    </>
                  )}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!loading && !listError && pagination.totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {pagination.totalPages}</span>
            <div>
              <button className="button button-secondary button-small" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <button className="button button-secondary button-small" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
