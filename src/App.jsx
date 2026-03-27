import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import GalleryView from './components/GalleryView';
import BackupModal from './components/BackupModal';
import { Map, Images, FileText } from 'lucide-react';
import JournalView from './pages/JournalView';
import JournalEditorModal from './components/JournalEditorModal';
import { checkAndAutoBackup } from './utils/backup';

// ipcRenderer for listening to native menu events (Electron only)
let ipcRenderer;
if (typeof window !== 'undefined' && window.require) {
  try { ipcRenderer = window.require('electron').ipcRenderer; } catch (_) {}
}

function AppLayout() {
  const [activeTab, setActiveTab] = useState('map');
  const [selectedOutingId, setSelectedOutingId] = useState(null);
  const [mapExtentBounds, setMapExtentBounds] = useState(null);
  const [isJournalEditorOpen, setIsJournalEditorOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  useEffect(() => {
    const handleGalleryExtent = (e) => {
      setMapExtentBounds(e.detail);
      setActiveTab('gallery');
    };
    const handleOpenJournal = (e) => {
      setEditingJournal(e.detail?.journal || null);
      setIsJournalEditorOpen(true);
    };
    window.addEventListener('apply-gallery-extent', handleGalleryExtent);
    window.addEventListener('open-journal-editor', handleOpenJournal);

    if (ipcRenderer) {
      // Native menu → open backup modal
      ipcRenderer.on('menu:backup', () => setIsBackupModalOpen(true));
      ipcRenderer.on('menu:restore', () => setIsBackupModalOpen(true));

      ipcRenderer.on('app:before-quit', async () => {
        try {
          await checkAndAutoBackup();
        } catch (err) {
          console.warn('On-exit auto-backup failed:', err);
        } finally {
          ipcRenderer.send('app:quit-ready');
        }
      });
    }

    return () => {
      window.removeEventListener('apply-gallery-extent', handleGalleryExtent);
      window.removeEventListener('open-journal-editor', handleOpenJournal);
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('menu:backup');
        ipcRenderer.removeAllListeners('menu:restore');
        ipcRenderer.removeAllListeners('app:before-quit');
      }
    };
  }, []);

  return (
    <div className="app-container">
      <Sidebar 
        selectedOutingId={selectedOutingId}
        setSelectedOutingId={setSelectedOutingId}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Tab Bar */}
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '8px 12px',
          backgroundColor: 'var(--sidebar-bg)',
          borderBottom: '1px solid var(--panel-border)',
          zIndex: 20,
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('map')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: activeTab === 'map' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'map' ? 'white' : 'var(--text-secondary)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Map size={16} /> Map
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: activeTab === 'gallery' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'gallery' ? 'white' : 'var(--text-secondary)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Images size={16} /> Gallery
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: activeTab === 'journal' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'journal' ? 'white' : 'var(--text-secondary)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <FileText size={16} /> Journal
          </button>
        </div>

        {/* Content */}
        <div className="main-content" style={{ display: activeTab === 'map' ? 'flex' : 'none' }}>
          <Dashboard selectedOutingId={selectedOutingId} setSelectedOutingId={setSelectedOutingId} />
        </div>

        {activeTab === 'gallery' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <GalleryView 
              selectedOutingId={selectedOutingId} 
              setSelectedOutingId={setSelectedOutingId} 
              mapExtentBounds={mapExtentBounds}
              setMapExtentBounds={setMapExtentBounds}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'journal' && (
          <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fafafa' }}>
            <JournalView 
              setSelectedOutingId={setSelectedOutingId} 
              setActiveTab={setActiveTab} 
            />
          </div>
        )}
      </div>

      {isJournalEditorOpen && (
        <JournalEditorModal
          editJournal={editingJournal}
          onClose={() => {
            setIsJournalEditorOpen(false);
            setEditingJournal(null);
          }}
        />
      )}

      {isBackupModalOpen && (
        <BackupModal onClose={() => setIsBackupModalOpen(false)} />
      )}
    </div>
  );
}

export default AppLayout;
