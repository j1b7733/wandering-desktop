import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Image as ImageIcon, Edit3, Trash2, Activity, Save, UploadCloud, MapPin } from 'lucide-react';
import { extractExifFromFile } from '../utils/exifUtils';
import { saveOuting, deleteOuting } from '../utils/storage';

// Compute Haversine distance in meters
function getDistanceMeters(p1, p2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLon = (p2.lng - p1.lng) * rad;
  const lat1 = p1.lat * rad;
  const lat2 = p2.lat * rad;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function OutingInfoModal({ outing, onClose }) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(outing?.title || '');
  const [draftDate, setDraftDate] = useState(outing?.date ? new Date(outing.date).toISOString().split('T')[0] : '');
  const [draftGeneralNote, setDraftGeneralNote] = useState(outing?.generalNote || '');
  const [draftPhotos, setDraftPhotos] = useState(outing?.photos || []);
  const fileInputRef = useRef(null);
  


  // Note editing state: maps note.id -> draft text
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [draftNoteText, setDraftNoteText] = useState('');

  // Live metrics
  const photosCount = outing?.photos?.length || 0;
  const tracksCount = outing?.tracks?.length || 0;
  const notesCount = outing?.notes?.length || 0;

  let distanceKm = 0;
  if (outing?.tracks && outing.tracks.length > 1) {
    for (let i = 1; i < outing.tracks.length; i++) {
        distanceKm += getDistanceMeters(outing.tracks[i-1], outing.tracks[i]) / 1000;
    }
  }

  // Compute centroid of all GPS points in the outing
  const getOutingCentroid = () => {
    const pts = [
      ...(outing.tracks || []),
      ...(outing.notes || []),
      ...(outing.photos || []),
    ].filter(p => p.lat != null && p.lng != null);
    if (!pts.length) return null;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat, lng };
  };



  const handleSaveMeta = async () => {
    const updated = { 
      ...outing, 
      title: draftTitle, 
      date: new Date(draftDate).toISOString(),
      generalNote: draftGeneralNote,
      photos: draftPhotos
    };
    await saveOuting(updated);
    window.dispatchEvent(new Event('outing-imported')); 
    onClose();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newBatch = [];
    for (const file of files) {
        let currentExif = null;
        let currentLat = outing?.tracks?.[0]?.lat || outing?.notes?.[0]?.lat || 0;
        let currentLng = outing?.tracks?.[0]?.lng || outing?.notes?.[0]?.lng || 0;

        try {
          const { exif, gps } = await extractExifFromFile(file);

          if (exif) {
            currentExif = exif;
          }

          if (gps) {
            currentLat = gps.latitude;
            currentLng = gps.longitude;
          }
        } catch (err) {
          console.warn("Failed to parse EXIF:", err);
        }

        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
        });

        newBatch.push({
            id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            data: dataUrl,
            exif: currentExif,
            lat: currentLat,
            lng: currentLng,
            text: ''
        });
    }

    setDraftPhotos(prev => [...prev, ...newBatch]);
  };

  const handleSaveNote = async (noteId) => {
    const updatedNotes = (outing.notes || []).map(n => 
      n.id === noteId ? { ...n, text: draftNoteText } : n
    );
    const updated = { ...outing, notes: updatedNotes };
    await saveOuting(updated);
    setEditingNoteId(null);
    window.dispatchEvent(new Event('outing-imported'));
  };

  const handleDelete = async () => {
    if (confirm(`Are you absolutely sure you want to delete "${outing.title}"? This cannot be undone.`)) {
      await deleteOuting(outing.id);
      window.dispatchEvent(new Event('outing-imported'));
      onClose();
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div 
        style={{
          backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
          borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '540px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editing ? 'Edit Outing Details' : 'Outing Information'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Metadata Block */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Outing Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={draftTitle} 
                  onChange={e => setDraftTitle(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={draftDate} 
                  onChange={e => setDraftDate(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>General Notes</label>
                <textarea 
                  className="input-field" 
                  value={draftGeneralNote} 
                  onChange={e => setDraftGeneralNote(e.target.value)}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Move Location */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Move Location
                </label>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', gap: '8px', borderStyle: 'dashed' }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('activate-move-outing-mode', { detail: { outingId: outing.id } }));
                    onClose();
                  }}
                >
                  <MapPin size={16} /> Choose New Location on Map
                </button>
              </div>

              {/* Edit Photos Manager Grid */}
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage Assets</label>
                
                {draftPhotos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                     {draftPhotos.map((photo, i) => (
                        <div key={photo.id || i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '4px', overflow: 'hidden' }}>
                           <img src={photo.thumb || photo.data} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                           <button 
                              className="btn-ghost" 
                              style={{ position: 'absolute', top: '2px', right: '2px', padding: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px' }}
                              onClick={() => setDraftPhotos(prev => prev.filter(p => p.id !== photo.id))}
                              title="Remove Photo"
                           >
                              <X size={14} />
                           </button>
                        </div>
                     ))}
                  </div>
                )}

                <div 
                  style={{ border: '2px dashed var(--panel-border)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={24} color="var(--accent-primary)" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem' }}>Add Photos</div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  onClick={(e) => e.target.value = null}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveMeta}>Save Changes</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                   <h2 style={{ fontSize: '1.4rem', margin: '0 0 8px 0', color: 'white' }}>{outing.title}</h2>
                   <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> {new Date(outing.date).toLocaleDateString()}</span>
                     {outing.startTime && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14}/> {new Date(outing.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                   </div>
                </div>
                <button className="btn-ghost" onClick={() => setEditing(true)} title="Edit Title and Date" style={{ color: 'var(--accent-primary)' }}>
                  <Edit3 size={18} />
                </button>
              </div>
            </div>
          )}

          {/* General Note */}
          {!editing && outing.generalNote && (
             <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'white' }}>General Notes</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                   {outing.generalNote}
                </p>
             </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Tracking</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Activity size={18} color="var(--accent-primary)" />
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>{distanceKm.toFixed(2)} km</span>
              </div>
              <span style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tracksCount} GPS Points</span>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Assets</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                    <ImageIcon size={16} color="var(--accent-primary)" /> <span style={{ fontSize: '1rem', fontWeight: 500 }}>{photosCount} Photos</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                    <Edit3 size={16} color="var(--accent-primary)" /> <span style={{ fontSize: '1rem', fontWeight: 500 }}>{notesCount} Notes</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Notes Ledger */}
          {outing.notes && outing.notes.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Journal Notes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outing.notes.map(note => {
                  const isEditing = editingNoteId === note.id;
                  return (
                    <div key={note.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                           🕐 {new Date(note.timestamp).toLocaleString()}
                        </span>
                        {!isEditing && (
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0px', color: 'var(--text-secondary)' }}
                            onClick={() => { setEditingNoteId(note.id); setDraftNoteText(note.text); }}
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <textarea 
                            value={draftNoteText}
                            onChange={e => setDraftNoteText(e.target.value)}
                            style={{ width: '100%', minHeight: '80px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'white', padding: '8px', fontSize: '0.9rem', resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleSaveNote(note.id)}><Save size={14} /> Update</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'white', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {note.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Footer */}
          {!editing && (
             <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-outline"
                  onClick={handleDelete}
                  style={{ color: '#ff8888', borderColor: 'rgba(255,60,60,0.5)', backgroundColor: 'rgba(255,60,60,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Trash2 size={16} /> Delete Outing
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
