import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function NoteEditorModal({ note, defaultLocation, onClose, onSave }) {
  const [text, setText] = useState(note?.text || '');
  const [lat, setLat] = useState(note?.lat || defaultLocation.lat);
  const [lng, setLng] = useState(note?.lng || defaultLocation.lng);

  const handleSave = () => {
    if (!text.trim()) return;
    onSave({
      id: note?.id || 'note_' + Date.now(),
      text,
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2>{note ? 'Edit Journal Note' : 'New Journal Note'}</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="form-group">
          <label>Journal Entry</label>
          <textarea 
            rows={5}
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your thoughts about this place..."
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Latitude</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Longitude</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!text.trim()}>
            <Save size={16} /> Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
