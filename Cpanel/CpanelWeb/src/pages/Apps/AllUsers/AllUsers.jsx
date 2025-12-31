import React, { useEffect, useState } from 'react';
import { tokenService } from '../../../services/tokenService';
import { api } from '../../../services/api';
import '../AppSettings/appSettingsSty.css';

export default function AllUsers(){
  const token = tokenService.get();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decisions, setDecisions] = useState({}); // email -> keepUserId
  const [usernameChanges, setUsernameChanges] = useState({}); // userId -> newUsername
  const [showPreview, setShowPreview] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [copyFrom, setCopyFrom] = useState({}); // email -> userId to copy details from

  useEffect(()=>{ fetchAllUsers(); }, []);

  async function fetchAllUsers(){
    setLoading(true);
    try {
      const resp = await api.get('/apps/all-users', token);
      if (resp.success) setData(resp.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch users');
    } finally { setLoading(false); }
  }

  async function toggleCombine(enabled){
    setSaving(true);
    try {
      const resp = await api.put('/apps/combine-users', { enabled }, token);
      if (resp.success) {
        await fetchAllUsers();
      } else alert(resp.message || 'Failed to update');
    } catch (err){ console.error(err); alert('Failed to update'); }
    setSaving(false);
  }

  function setKeep(email, userId){
    setDecisions(prev => ({ ...prev, [email]: userId }));
  }

  function setCopySource(email, userId){
    setCopyFrom(prev => ({ ...prev, [email]: userId }));
  }

  function setUsername(userId, val){
    setUsernameChanges(prev=>({ ...prev, [userId]: val }));
  }

  // prepare preview of merges before applying
  function preparePreview(){
    const merges = (data.groupsByEmail || []).map(g => ({
      email: g[0].email,
      keepUserId: decisions[g[0].email] || g[0].id,
      otherUserIds: g.filter(u => String(u.id) !== String(decisions[g[0].email] || g[0].id)).map(u => u.id),
      usernameChanges: {},
      copyFromUserId: copyFrom[g[0].email] || null
    }));
    for (const [uid, name] of Object.entries(usernameChanges)){
      for (const mg of merges){ if (!mg.usernameChanges) mg.usernameChanges = {}; mg.usernameChanges[uid] = name; }
    }
    setPreviewPayload({ merges, summary: { groups: merges.length, totalUsers: data.users.length } });
    setShowPreview(true);
  }

  async function confirmApply(){
    if (!previewPayload) return alert('Nothing to apply');
    if (!confirm('This operation will delete merged user records and update usernames. Do you want to proceed?')) return;
    setSaving(true);
    try {
      const resp = await api.post('/apps/all-users/merge', previewPayload, token);
      if (resp.success) { alert('Merges applied'); setShowPreview(false); fetchAllUsers(); }
      else alert(resp.message || 'Failed to apply merges');
    } catch (err){ console.error(err); alert('Failed to apply merges'); }
    setSaving(false);
  }

  function exportCSV(){
    if (!data || !data.users) return alert('No users');
    const rows = data.users.map(u => ({ id: u.id, email: u.email, username: u.username, name: u.name, app: u.app_name, created_at: u.created_at }));
    const csv = [Object.keys(rows[0]).join(',')].concat(rows.map(r => Object.values(r).map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'all_users.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div>Loading users...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="app-settings">
      <h1>All Users (All Apps)</h1>
      <div style={{marginBottom:12}}>
        <label><input type="checkbox" checked={!!data.combineUsersAcrossApps} onChange={(e)=>toggleCombine(e.target.checked)} disabled={saving} /> Combine users across apps (disabled by default)</label>
        <button style={{marginLeft:12}} onClick={exportCSV}>Export CSV</button>
      </div>

      <h3>Duplicate users by email</h3>
      {data.groupsByEmail.length === 0 && <div>No duplicate emails across apps.</div>}
      {data.groupsByEmail.map((group, idx) => (
        <div key={idx} style={{border:'1px solid #ddd', padding:8, marginBottom:8}}>
          <div><strong>Email:</strong> {group[0].email}</div>
          {group.map(u => (
            <div key={u.id} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0'}}>
              <label><input type="radio" name={`keep-${group[0].email}`} checked={String(decisions[group[0].email] || group[0].id) === String(u.id)} onChange={()=>setKeep(group[0].email, u.id)} /> Keep</label>
              <div style={{flex:1}}>{u.app_name} — {u.name} ({u.username}) — created {new Date(u.created_at).toLocaleString()}</div>
            </div>
          ))}
          <div style={{marginTop:8}}>
            <label style={{fontSize:13}}>Use details from: </label>
            <select value={copyFrom[group[0].email] || ''} onChange={(e)=>setCopySource(group[0].email, e.target.value || null)}>
              <option value=''>(do not copy - keep chosen record's existing data)</option>
              {group.map(u => <option key={u.id} value={u.id}>{u.app_name} — {u.name} ({u.username})</option>)}
            </select>
          </div>
        </div>
      ))}

      <h3>Username conflicts (same username, different emails)</h3>
      {data.usernameConflicts.length === 0 && <div>No username conflicts.</div>}
      {data.usernameConflicts.map((group, idx) => (
        <div key={idx} style={{border:'1px solid #eee', padding:8, marginBottom:8}}>
          <div><strong>Username:</strong> {group[0].username}</div>
          {group.map(u => (
            <div key={u.id} style={{display:'flex', gap:8, alignItems:'center', padding:'6px 0'}}>
              <div style={{flex:1}}>{u.app_name} — {u.email} — <input value={usernameChanges[u.id] || u.username || ''} onChange={(e)=>setUsername(u.id, e.target.value)} /></div>
            </div>
          ))}
        </div>
      ))}

      <div style={{marginTop:16}}>
        <button onClick={preparePreview} disabled={saving}>{saving ? 'Preparing...' : 'Preview merges'}</button>
      </div>

      {showPreview && previewPayload && (
        <div style={{marginTop:20, border:'1px solid #cfc', padding:12, background:'#fffbe6'}}>
          <h4>Preview: Merges to apply</h4>
          <div>Duplicate groups: {previewPayload.summary.groups}</div>
          <div>Total users scanned: {previewPayload.summary.totalUsers}</div>
          <div style={{marginTop:8}}>
            <button onClick={confirmApply} disabled={saving} style={{marginRight:8}}>{saving ? 'Applying...' : 'Confirm and apply merges'}</button>
            <button onClick={() => setShowPreview(false)} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
