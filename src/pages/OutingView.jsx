import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOuting, saveOuting, deleteOuting } from '../utils/storage';
import OutingMap from '../components/OutingMap';
import NoteEditorModal from '../components/NoteEditorModal';
import PhotoEditorModal from '../components/PhotoEditorModal';
import { ArrowLeft, Trash2, Edit3, ImagePlus } from 'lucide-react';

export default function OutingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [outing, setOuting] = useState(null);
  const [addingNote, setAddingNote] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingTracks, setEditingTracks] = useState(false);
  
  // Custom click coordinate tracking
  const [pickingLocationFor, setPickingLocationFor] = useState(null); // 'note' | 'photo' | null
  const [clickLocation, setClickLocation] = useState(null);

  // Meta edits
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState('');

  const loadOuting = async () => {
    const data = await getOuting(id);
    if (!data) {
      navigate('/');
      return;
    }
    setOuting(data);
    setDraftTitle(data.title || '');
    setDraftDate(data.date ? new Date(data.date).toISOString().split('T')[0] : '');
  };

  useEffect(() => {
    loadOuting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const handleAddPhotoAtPin = (e) => {
      setClickLocation({ lat: e.detail.lat, lng: e.detail.lng });
      setAddingPhoto(true);
    };
    window.addEventListener('request-add-photo-at-pin', handleAddPhotoAtPin);
    return () => window.removeEventListener('request-add-photo-at-pin', handleAddPhotoAtPin);
  }, []);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this outing? This action cannot be undone.')) {
      await deleteOuting(id);
      window.dispatchEvent(new Event('outing-imported')); // Refresh sidebar
      navigate('/');
    }
  };

  const handleSaveItem = async (type, item) => {
    const updated = { ...outing };
    if (type === 'note') {
      updated.notes = [...(updated.notes || []), item];
      setAddingNote(false);
    } else {
      // item may be a single photo object OR an array from a batch upload
      const newPhotos = Array.isArray(item) ? item : [item];
      updated.photos = [...(updated.photos || []), ...newPhotos];
      setAddingPhoto(false);
    }
    
    await saveOuting(updated);
    setOuting(updated);
    window.dispatchEvent(new Event('outing-imported'));
  };

  if (!outing) return null;

  const defaultLocation = clickLocation || (outing.tracks && outing.tracks.length > 0 
    ? outing.tracks[0] 
    : { lat: 0, lng: 0 });

  const handleMapClick = (latlng) => {
    if (pickingLocationFor) {
      setClickLocation({ lat: latlng.lat, lng: latlng.lng });
      if (pickingLocationFor === 'photo') setAddingPhoto(true);
      if (pickingLocationFor === 'note') setAddingNote(true);
      setPickingLocationFor(null);
    }
  };

  const handleSaveMeta = async () => {
    const updated = { ...outing, title: draftTitle, date: new Date(draftDate).toISOString() };
    await saveOuting(updated);
    setOuting(updated);
    setEditingMeta(false);
    window.dispatchEvent(new Event('outing-imported'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Bar */}
      <div className="flex-between" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-bg)', zIndex: 10 }}>
        {editingMeta ? (
          <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '16px' }}>
            <input 
              type="text" 
              value={draftTitle} 
              onChange={e => setDraftTitle(e.target.value)} 
              style={{ flex: 1 }}
              placeholder="Outing Title..."
            />
            <input 
              type="date" 
              value={draftDate} 
              onChange={e => setDraftDate(e.target.value)} 
            />
            <button className="btn btn-primary" onClick={handleSaveMeta}>Save</button>
            <button className="btn btn-ghost" onClick={() => setEditingMeta(false)}>Cancel</button>
          </div>
        ) : (
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditingMeta(true)} title="Click to edit name/date">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {outing.title} <Edit3 size={14} color="var(--text-secondary)" />
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {new Date(outing.date).toLocaleDateString()} • {outing.tracks ? outing.tracks.length : 0} track points
              {outing.startTime && ` • Start: ${new Date(outing.startTime).toLocaleTimeString()}`}
            </p>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${pickingLocationFor === 'note' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setPickingLocationFor(pickingLocationFor === 'note' ? null : 'note')} 
            title="Drop a Note on the Map"
          >
            <Edit3 size={16} /> Add Note
          </button>
          <button 
            className={`btn ${pickingLocationFor === 'photo' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setPickingLocationFor(pickingLocationFor === 'photo' ? null : 'photo')} 
            title="Drop a Photo on the Map"
          >
            <ImagePlus size={16} /> Add Photo
          </button>
          <div style={{ width: '1px', backgroundColor: 'var(--panel-border)', margin: '0 8px' }}></div>
          <button 
            className={`btn ${editingTracks ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => setEditingTracks(!editingTracks)} 
            title={editingTracks ? "Finish editing tracks" : "Edit Track Nodes"}
          >
            <Edit3 size={16} /> {editingTracks ? 'Done Editing' : 'Edit Tracks'}
          </button>
          <div style={{ width: '1px', backgroundColor: 'var(--panel-border)', margin: '0 8px' }}></div>
          <button className="btn btn-ghost" onClick={handleDelete} title="Delete">
            <Trash2 size={18} color="var(--danger-color)" />
          </button>
        </div>
      </div>

      {pickingLocationFor && (
        <div style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
          Click anywhere on the map to place your {pickingLocationFor === 'note' ? 'Journal Note' : 'Photo'}
        </div>
      )}

      {/* Map Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        <OutingMap 
          outing={outing} 
          onMapClick={handleMapClick}
          editingTracks={editingTracks}
          onTrackChange={async (newTracks) => {
            const updated = { ...outing, tracks: newTracks };
            await saveOuting(updated);
            setOuting(updated);
            window.dispatchEvent(new Event('outing-imported'));
          }}
        />
      </div>

      {addingNote && (
        <NoteEditorModal 
          defaultLocation={defaultLocation}
          onClose={() => setAddingNote(false)}
          onSave={(note) => handleSaveItem('note', note)}
        />
      )}

      {addingPhoto && (
        <PhotoEditorModal 
          defaultLocation={defaultLocation}
          onClose={() => setAddingPhoto(false)}
          onSave={(photo, wasTagged) => {
            if (wasTagged) {
               // The modal already saved it to the DB!
               loadOuting(); // refresh from DB
               window.dispatchEvent(new Event('outing-imported'));
               setAddingPhoto(false);
            } else {
               handleSaveItem('photo', photo);
            }
          }}
        />
      )}
    </div>
  );
}
