import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import GalleryView from './components/GalleryView';
import BackupModal from './components/BackupModal';
import HelpModal from './components/HelpModal';
import { Map, Images, FileText } from 'lucide-react';
import JournalView from './pages/JournalView';
import JournalEditorModal from './components/JournalEditorModal';
import { checkAndAutoBackup } from './utils/backup';
import { getAllOutings, saveOuting } from './utils/storage';

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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [globalMonthFilter, setGlobalMonthFilter] = useState('All');

  useEffect(() => {
    const handleGalleryExtent = (e) => {
      setMapExtentBounds(e.detail);
      setActiveTab('gallery');
    };
    const handleOpenJournal = (e) => {
      setEditingJournal(e.detail?.journal || null);
      setIsJournalEditorOpen(true);
    };
    const handleForceMapTab = () => setActiveTab('map');

    const handleBatchClassify = async () => {
      try {
        const allOutings = await getAllOutings();
        
        allOutings.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
        });
        
        const updatedOutingsMap = new globalThis.Map();

        for (const outing of allOutings) {
           if (!outing.photos || outing.photos.length === 0) continue;
           
           let outingModified = false;
           for (const photo of outing.photos) {
              if (!photo.classification && !photo.classificationPending) {
                  photo.classificationPending = true;
                  outingModified = true;
              }
           }
           
           if (outingModified) {
               updatedOutingsMap.set(outing.id, outing);
           }
        }

        if (updatedOutingsMap.size > 0) {
            for (const [id, modifiedOuting] of updatedOutingsMap) {
                await saveOuting(modifiedOuting);
            }
            window.dispatchEvent(new Event('outing-imported'));
        }
        
        window.dispatchEvent(new Event('force-map-tab'));
        setTimeout(() => {
             window.dispatchEvent(new Event('force-open-classification-review'));
        }, 50);
      } catch (err) {
        alert("Batch Classification Error: " + err.message);
        console.error("Batch Classification Sweep Error:", err);
      }
    };

    window.addEventListener('apply-gallery-extent', handleGalleryExtent);
    window.addEventListener('open-journal-editor', handleOpenJournal);
    window.addEventListener('force-map-tab', handleForceMapTab);
    window.addEventListener('trigger-batch-classify', handleBatchClassify);

    if (ipcRenderer) {
      // Native menu → open backup modal
      ipcRenderer.on('menu:backup', () => setIsBackupModalOpen(true));
      ipcRenderer.on('menu:restore', () => setIsBackupModalOpen(true));
      ipcRenderer.on('menu:help', () => setIsHelpModalOpen(true));
      
      ipcRenderer.on('menu:batch-classify', handleBatchClassify);

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
      window.removeEventListener('force-map-tab', handleForceMapTab);
      window.removeEventListener('trigger-batch-classify', handleBatchClassify);
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('menu:backup');
        ipcRenderer.removeAllListeners('menu:restore');
        ipcRenderer.removeAllListeners('menu:help');
        ipcRenderer.removeAllListeners('menu:batch-classify');
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
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
             <select 
                value={globalMonthFilter} 
                onChange={(e) => setGlobalMonthFilter(e.target.value)}
                style={{
                  background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)',
                  borderRadius: '16px', padding: '4px 12px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
                }}
             >
                <option value="All">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
             </select>
          </div>
        </div>

        {/* Content */}
        <div className="main-content" style={{ display: activeTab === 'map' ? 'flex' : 'none' }}>
          <Dashboard selectedOutingId={selectedOutingId} setSelectedOutingId={setSelectedOutingId} globalMonthFilter={globalMonthFilter} />
        </div>

        {activeTab === 'gallery' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <GalleryView 
              selectedOutingId={selectedOutingId} 
              setSelectedOutingId={setSelectedOutingId} 
              mapExtentBounds={mapExtentBounds}
              setMapExtentBounds={setMapExtentBounds}
              setActiveTab={setActiveTab}
              globalMonthFilter={globalMonthFilter}
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

      {isHelpModalOpen && (
        <HelpModal onClose={() => setIsHelpModalOpen(false)} />
      )}
    </div>
  );
}

export default AppLayout;
