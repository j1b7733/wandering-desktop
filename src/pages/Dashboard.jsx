import React, { useState, useEffect } from 'react';
import { MapPin, ImagePlus, Edit3, Expand, Wrench, ChevronDown, ChevronRight, X, GalleryHorizontal } from 'lucide-react';
import OutingMap from '../components/OutingMap';
import PhotoEditorModal from '../components/PhotoEditorModal';
import NoteEditorModal from '../components/NoteEditorModal';
import OutingSelectorModal from '../components/OutingSelectorModal';
import CreateOutingModal from '../components/CreateOutingModal';
import { getAllOutings, saveOuting } from '../utils/storage';

// A shared "global" outing ID used to stash standalone dashboard pins
const GLOBAL_OUTING_ID = '__global_pins__';

export default function Dashboard() {
  const [hasOutings, setHasOutings] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [creatingOuting, setCreatingOuting] = useState(false);
  const [pickingLocationFor, setPickingLocationFor] = useState(null);
  const [clickLocation, setClickLocation] = useState(null);
  const [showTools, setShowTools] = useState(false);

  const [pendingItemToSave, setPendingItemToSave] = useState(null);

  useEffect(() => {
    const checkOutings = async () => {
      const data = await getAllOutings();
      setHasOutings(data.length > 0);
    };
    checkOutings();
    
    const handleAddPhotoAtPin = (e) => {
      setClickLocation({ lat: e.detail.lat, lng: e.detail.lng });
      setAddingPhoto(true);
    };

    window.addEventListener('outing-imported', checkOutings);
    window.addEventListener('request-add-photo-at-pin', handleAddPhotoAtPin);
    return () => {
      window.removeEventListener('outing-imported', checkOutings);
      window.removeEventListener('request-add-photo-at-pin', handleAddPhotoAtPin);
    };
  }, []);

  const handleMapClick = (latlng) => {
    if (pickingLocationFor) {
      setClickLocation({ lat: latlng.lat, lng: latlng.lng });
      if (pickingLocationFor === 'photo') setAddingPhoto(true);
      if (pickingLocationFor === 'note') setAddingNote(true);
      if (pickingLocationFor === 'outing') setCreatingOuting(true);
      setPickingLocationFor(null);
    }
  };

  const handleSaveGlobalItem = (type, item) => {
    // Intercept immediate save and store temporarily to prompt user
    setPendingItemToSave({ type, item });
  };

  const finalizeSaveItem = async (targetOutingId) => {
    if (!pendingItemToSave) return;
    const { type, item } = pendingItemToSave;

    const allOutings = await getAllOutings();
    let targetOuting = allOutings.find(o => o.id === targetOutingId);

    if (!targetOuting && targetOutingId === GLOBAL_OUTING_ID) {
       targetOuting = {
          id: GLOBAL_OUTING_ID, title: 'Global Pins', date: new Date().toISOString(), startTime: new Date().toISOString(), visible: true, tracks: [], notes: [], photos: []
       };
    } else if (!targetOuting) {
       setPendingItemToSave(null);
       return;
    }

    if (type === 'photo') {
      const newPhotos = Array.isArray(item) ? item : [item];
      targetOuting = { ...targetOuting, photos: [...(targetOuting.photos || []), ...newPhotos] };
      setAddingPhoto(false);
    } else {
      targetOuting = { ...targetOuting, notes: [...(targetOuting.notes || []), item] };
      setAddingNote(false);
    }

    await saveOuting(targetOuting);
    window.dispatchEvent(new Event('outing-imported'));
    setClickLocation(null);
    setPendingItemToSave(null);
  };

  const handleSaveNewOuting = async (newOutingObj) => {
    await saveOuting(newOutingObj);
    window.dispatchEvent(new Event('outing-imported'));
    setCreatingOuting(false);
    setClickLocation(null);
  };

  const defaultLocation = clickLocation || { lat: 28.5, lng: -81.0 };

  return (
    <div style={{ flex: 1, position: 'relative', height: '100%' }}>
      {/* Background Map View showing all photos */}
      <OutingMap
        outing={null}
        onMapClick={handleMapClick}
      />

      {/* Expandable Speed Dial Actions */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '60px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}>
        <button
          className="btn btn-primary"
          style={{ backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', padding: '8px 16px' }}
          onClick={() => setShowTools(!showTools)}
          title="Toggle Utility Tools"
        >
          {showTools ? <X size={18} /> : <Wrench size={18} />} {showTools ? 'Close Tools' : 'Map Tools'}
        </button>

        {showTools && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <button
              className="btn btn-outline"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(13,17,23,0.9)' }}
              onClick={() => { window.dispatchEvent(new Event('request-gallery-extent')); setShowTools(false); }}
              title="Show Gallery photos within the immediate map view"
            >
              <GalleryHorizontal size={14} /> Filter Gallery to View
            </button>
            <button
              className="btn btn-outline"
              style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(13,17,23,0.9)' }}
              onClick={() => { window.dispatchEvent(new Event('zoom-to-global')); setShowTools(false); }}
              title="Zoom out to Global Data Extent"
            >
              <Expand size={14} /> Show All Outings
            </button>
            <button
              className={`btn ${pickingLocationFor === 'outing' ? 'btn-primary' : 'btn-outline'}`}
              style={{ backdropFilter: 'blur(8px)', backgroundColor: pickingLocationFor === 'outing' ? undefined : 'rgba(13,17,23,0.9)' }}
              onClick={() => { setPickingLocationFor(pickingLocationFor === 'outing' ? null : 'outing'); setShowTools(false); }}
              title="Create an Outing Here"
            >
              <MapPin size={14} /> Add Outing
            </button>
            <button
              className={`btn ${pickingLocationFor === 'photo' ? 'btn-primary' : 'btn-outline'}`}
              style={{ backdropFilter: 'blur(8px)', backgroundColor: pickingLocationFor === 'photo' ? undefined : 'rgba(13,17,23,0.9)' }}
              onClick={() => { setPickingLocationFor(pickingLocationFor === 'photo' ? null : 'photo'); setShowTools(false); }}
              title="Drop a Photo on the Map"
            >
              <ImagePlus size={14} /> Add Photo
            </button>
            <button
              className={`btn ${pickingLocationFor === 'note' ? 'btn-primary' : 'btn-outline'}`}
              style={{ backdropFilter: 'blur(8px)', backgroundColor: pickingLocationFor === 'note' ? undefined : 'rgba(13,17,23,0.9)' }}
              onClick={() => { setPickingLocationFor(pickingLocationFor === 'note' ? null : 'note'); setShowTools(false); }}
              title="Drop a Note on the Map"
            >
              <Edit3 size={14} /> Add Note
            </button>
          </div>
        )}
      </div>

      {/* Pickup mode banner */}
      {pickingLocationFor && (
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, backgroundColor: 'var(--accent-primary)', color: 'white',
          padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          Click anywhere on the map to place your {pickingLocationFor === 'note' ? 'Journal Note' : pickingLocationFor === 'photo' ? 'Photo' : 'Outing'}
        </div>
      )}

      {/* Floating Welcome Card (only when no outings) */}
      {!hasOutings && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            left: '24px',
            zIndex: 1000,
            backgroundColor: 'rgba(13, 17, 23, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '350px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        >
          <h2 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>Wandering Desktop</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Select an outing from the sidebar to view tracks and notes, or explore all your synced photos right here on the global map.
          </p>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={14} /> Quick Start
          </h3>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: '16px', lineHeight: '1.5', margin: 0 }}>
            <li>Export an outing from Wandering</li>
            <li>Click <strong>Import Record</strong> in the sidebar</li>
            <li>Click a photo on the map to view full size</li>
          </ul>
        </div>
      )}

      {addingPhoto && (
        <PhotoEditorModal
          defaultLocation={defaultLocation}
          onClose={() => { setAddingPhoto(false); setClickLocation(null); }}
          onSave={(photos, wasTagged) => {
            if (wasTagged) {
              window.dispatchEvent(new Event('outing-imported'));
              setAddingPhoto(false);
              setClickLocation(null);
            } else {
              handleSaveGlobalItem('photo', photos);
            }
          }}
        />
      )}

      {addingNote && (
        <NoteEditorModal
          defaultLocation={defaultLocation}
          onClose={() => { setAddingNote(false); setClickLocation(null); }}
          onSave={(note) => handleSaveGlobalItem('note', note)}
        />
      )}

      {creatingOuting && (
        <CreateOutingModal
          defaultLocation={defaultLocation}
          onClose={() => { setCreatingOuting(false); setClickLocation(null); }}
          onSave={handleSaveNewOuting}
        />
      )}

      {pendingItemToSave && (
        <OutingSelectorModal 
          title={`Where would you like to save this ${pendingItemToSave.type}?`}
          onClose={() => setPendingItemToSave(null)}
          onSelect={finalizeSaveItem}
        />
      )}
    </div>
  );
}
