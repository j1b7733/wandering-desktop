import React, { useState, useEffect } from 'react';
import { exportBackup, importBackup, showSaveDialog, showOpenDialog } from '../utils/backup';
import { getSetting } from '../utils/storage';
import { ArchiveRestore, HardDriveDownload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function BackupModal({ onClose }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    getSetting('lastAutoBackup').then(val => {
      if (val) setLastBackup(new Date(val));
    });
  }, []);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const filePath = await showSaveDialog();
      if (!filePath) { setBusy(false); return; }
      await exportBackup(filePath, setStatus);
      setDone(true);
      setLastBackup(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!window.confirm(
      'Restoring a backup will replace ALL current data.\n\nThe app will reload after restore. Continue?'
    )) return;

    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const filePath = await showOpenDialog();
      if (!filePath) { setBusy(false); return; }
      await importBackup(filePath, setStatus);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg, #1e1e2e)',
          border: '1px solid var(--panel-border, #333)',
          borderRadius: '12px',
          padding: '28px 32px',
          width: '400px',
          color: 'var(--text-primary, #eee)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Backup & Restore</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #999)', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Last backup info */}
        <p style={{ margin: '0 0 24px', fontSize: '0.83rem', color: 'var(--text-secondary, #999)' }}>
          {lastBackup
            ? <>Last backup: <strong>{lastBackup.toLocaleString()}</strong></>
            : 'No backup has been recorded yet.'}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleExport}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
              background: 'var(--accent-primary, #4f8ef7)', color: 'white',
              fontWeight: 600, fontSize: '0.9rem', opacity: busy ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <HardDriveDownload size={18} />
            Back Up Now
          </button>

          <button
            onClick={handleImport}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '8px', cursor: busy ? 'not-allowed' : 'pointer',
              background: 'none',
              border: '1px solid var(--panel-border, #444)',
              color: 'var(--text-primary, #eee)',
              fontWeight: 600, fontSize: '0.9rem', opacity: busy ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <ArchiveRestore size={18} />
            Restore from Backup…
          </button>
        </div>

        {/* Status area */}
        {(busy || done || error || status) && (
          <div style={{
            marginTop: '20px',
            padding: '10px 14px',
            borderRadius: '7px',
            background: error ? 'rgba(220,53,69,0.12)' : done ? 'rgba(40,167,69,0.12)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.83rem',
            color: error ? '#f87171' : done ? '#4ade80' : 'var(--text-secondary, #aaa)',
          }}>
            {busy && !done && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {done && <CheckCircle size={14} />}
            {error && <AlertCircle size={14} />}
            <span>{error || status}</span>
          </div>
        )}

        <p style={{ margin: '20px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary, #666)' }}>
          Auto-backups run every 5 days and are saved to<br />
          <code style={{ fontSize: '0.7rem' }}>~/.wandering-desktop/backups/</code>
          <br />(2 most recent kept)
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
