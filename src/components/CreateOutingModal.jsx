import React, { useState, useRef } from 'react';
import { X, Upload, MapPin } from 'lucide-react';

export default function CreateOutingModal({ defaultLocation, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [noteText, setNoteText] = useState('');
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const readPhotosAsBase64 = async (fileArray) => {
    return Promise.all(fileArray.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            lat: defaultLocation.lat,
            lng: defaultLocation.lng,
            text: file.name,
            data: e.target.result,
            timestamp: new Date().toISOString(),
            classificationPending: true
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    
    setSaving(true);
    try {
      // 1. Convert timestamp
      const startDateTime = new Date(`${date}T${time}:00`);
      
      // 2. Format notes
      const finalNotes = [];
      if (noteText.trim() !== '') {
        finalNotes.push({
          id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          lat: defaultLocation.lat,
          lng: defaultLocation.lng,
          text: noteText,
          timestamp: startDateTime.toISOString()
        });
      }

      // 3. Extract and map Photos
      const finalPhotos = await readPhotosAsBase64(files);

      // 4. Construct raw generic Outing Object structurally identical to mobile payloads
      const outing = {
        id: 'desktop_outing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: title.trim(),
        date: startDateTime.toISOString(),
        startTime: startDateTime.toISOString(),
        baseLat: defaultLocation.lat,
        baseLng: defaultLocation.lng,
        visible: true,
        tracks: [],
        notes: finalNotes,
        photos: finalPhotos
      };

      await onSave(outing); // Dashboard handles intercepting into storage logic.
    } catch (err) {
      console.error(err);
      alert('Error saving outing. Please check the files and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '500px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <MapPin size={20} color="var(--accent-primary)"/> Create New Outing
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Location Bound</label>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-primary)', border: '1px solid var(--panel-border)' }}>
              {defaultLocation.lat.toFixed(5)}, {defaultLocation.lng.toFixed(5)}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Outing Title</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="E.g. Weekend Hike" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Start Time</label>
              <input 
                type="time" 
                className="input-field" 
                value={time} 
                onChange={e => setTime(e.target.value)} 
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Starting Note / Description (Optional)</label>
            <textarea
              className="input-field"
              placeholder="What was this outing about?"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
            />
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upload Photos (Optional)</label>
             <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '24px',
                textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
            >
              <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>Click or drag images here</p>
              {files.length > 0 && (
                <p style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  {files.length} photo{files.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              multiple 
              onChange={handleFileChange} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Creating...' : 'Create Outing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
