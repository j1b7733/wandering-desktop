import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { getAllOutings, saveJournal } from '../utils/storage';

export default function JournalEditorModal({ onClose, editJournal = null }) {
  const [title, setTitle] = useState(editJournal?.title || '');
  const [body, setBody] = useState(editJournal?.body || '');
  const [outingId, setOutingId] = useState(editJournal?.outingId || 'none');
  const [selectedPhotos, setSelectedPhotos] = useState(editJournal?.photos || []);
  
  const [allOutings, setAllOutings] = useState([]);
  const [globalPhotos, setGlobalPhotos] = useState([]);
  const [availablePhotos, setAvailablePhotos] = useState([]);

  useEffect(() => {
    const fetchStorage = async () => {
       const outings = await getAllOutings();
       setAllOutings(outings);

       const allPics = [];
       outings.forEach(out => {
          if (out.photos && out.photos.length > 0) {
             out.photos.forEach(p => allPics.push({ ...p, outingId: out.id }));
          }
       });
       setGlobalPhotos(allPics);
       setAvailablePhotos(allPics);
    };
    fetchStorage();
  }, []);

  // Update available photos when selected outing changes
  useEffect(() => {
    if (outingId === 'none') {
       setAvailablePhotos(globalPhotos);
    } else {
       setAvailablePhotos(globalPhotos.filter(p => p.outingId === outingId));
    }
  }, [outingId, globalPhotos]);

  const togglePhoto = (photo) => {
    setSelectedPhotos(prev => {
       const exists = prev.find(p => p.id === photo.id);
       if (exists) return prev.filter(p => p.id !== photo.id);
       return [...prev, photo];
    });
  };

  const handleSave = async () => {
    if (!title.trim() && !body.trim()) return;

    // Strip EXIF and full data properties from photos to aggressively save indexeddb storage
    const strippedPhotos = selectedPhotos.map(p => ({
       id: p.id,
       data: p.data,
       thumb: p.thumb || p.data
    }));

    const newJournal = {
      ...(editJournal || {}), // preserve id, createdAt, etc.
      title: title.trim(),
      body: body.trim(),
      outingId: outingId === 'none' ? null : outingId,
      photos: strippedPhotos
    };

    await saveJournal(newJournal);
    window.dispatchEvent(new Event('journal-updated'));
    onClose();
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-between" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--panel-border)', flexShrink: 0 }}>
          <h2 style={{ margin: 0 }}>{editJournal ? 'Edit Journal Entry' : 'Create Journal Entry'}</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-group">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Associate with Outing (Optional)</label>
            <select 
              value={outingId} 
              onChange={e => setOutingId(e.target.value)}
              style={{ padding: '10px', backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="none">-- Standalone Entry --</option>
              {allOutings.filter(o => o.id !== '__global_pins__').map(o => (
                <option key={o.id} value={o.id}>{o.title || 'Untitled Outing'} ({new Date(o.date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <input 
              type="text" 
              placeholder="Entry Title..." 
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ fontSize: '1.5rem', fontWeight: 'bold', border: 'none', borderBottom: '2px solid transparent', padding: '8px 0', backgroundColor: 'transparent' }}
              onFocus={e => e.target.style.borderBottomColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderBottomColor = 'transparent'}
            />
          </div>

          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea 
              placeholder="Write your journal entry here..."
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ flex: 1, minHeight: '150px', fontSize: '1rem', lineHeight: '1.6', padding: '12px', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--app-bg)', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={16} /> Attach Photos ({selectedPhotos.length} selected)
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginTop: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px', backgroundColor: 'var(--app-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--panel-border)' }}>
              {availablePhotos.length === 0 ? (
                 <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '16px' }}>No photos available for this selection.</p>
              ) : (
                availablePhotos.map(photo => {
                  const isSelected = selectedPhotos.some(p => p.id === photo.id);
                  return (
                    <div 
                      key={photo.id}
                      onClick={() => togglePhoto(photo)}
                      style={{ 
                        position: 'relative', 
                        aspectRatio: '1', 
                        cursor: 'pointer',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: isSelected ? '3px solid var(--accent-primary)' : '1px solid transparent',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      <img src={photo.thumb || photo.data} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--panel-border)', flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim() && !body.trim()}>
            <Save size={16} /> {editJournal ? 'Update Entry' : 'Publish Entry'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
