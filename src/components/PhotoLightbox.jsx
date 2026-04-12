import React, { useState } from 'react';
import { ChevronLeft, ChevronRight as ChevronRightIcon, X, Trash2 } from 'lucide-react';
import SocialMediaAssistantSidebar from './SocialMediaAssistantSidebar';
import { getAllOutings, saveOuting } from '../utils/storage';
import { BIOLOGICAL_GENRES, GENRE_OPTIONS, SUBGENRE_MAP } from '../utils/taxonomy';

// ─────────────────────────────────────────────
//  EXIF Detail Panel (second scrollable page)
// ─────────────────────────────────────────────
export function ExifPanel({ exif }) {
  if (!exif) return <p style={{ color: 'var(--text-secondary)', padding: '16px' }}>No EXIF data available.</p>;

  const rows = [
    exif.cameraMake || exif.cameraModel
      ? { label: 'Camera', value: [exif.cameraMake, exif.cameraModel].filter(Boolean).join(' ') }
      : null,
    exif.lensMake || exif.lensModel
      ? { label: 'Lens', value: [exif.lensMake, exif.lensModel].filter(Boolean).join(' ') }
      : null,
    exif.focalLength
      ? { label: 'Focal Length', value: `${exif.focalLength}mm${exif.focalLength35mm ? ` (${exif.focalLength35mm}mm eq.)` : ''}` }
      : null,
    exif.dateTaken
      ? { label: 'Date Taken', value: new Date(exif.dateTaken).toLocaleString() }
      : null,
    exif.aperture
      ? { label: 'Aperture', value: `f/${exif.aperture}` }
      : null,
    exif.shutterSpeed
      ? { label: 'Shutter Speed', value: exif.shutterSpeed >= 1 ? `${exif.shutterSpeed}s` : `1/${Math.round(1 / exif.shutterSpeed)}s` }
      : null,
    exif.iso
      ? { label: 'ISO', value: exif.iso }
      : null,
    exif.exposureComp !== undefined
      ? { label: 'Exposure Comp', value: `${exif.exposureComp} EV` }
      : null,
    exif.meteringMode
      ? { label: 'Metering', value: exif.meteringMode }
      : null,
    exif.cameraMode
      ? { label: 'Program', value: exif.cameraMode }
      : null,
    exif.focusMode
      ? { label: 'Focus Mode', value: exif.focusMode }
      : null,
    exif.shutterMode
      ? { label: 'Exposure Mode', value: exif.shutterMode }
      : null,
    exif.dateEdited
      ? { label: 'Date Edited', value: new Date(exif.dateEdited).toLocaleString() }
      : null,
  ].filter(Boolean);

  return (
    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
      <h3 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
        EXIF Data
      </h3>
      {rows.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Photo Detail Lightbox
// ─────────────────────────────────────────────
export default function PhotoLightbox({ photos, startIndex, onClose, onUnassociate, onDelete, onSidebarUpdate }) {
  const [idx, setIdx] = useState(startIndex || 0);
  const [showExif, setShowExif] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const photo = photos[idx];
  const count = photos.length;

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [draftGenre, setDraftGenre] = useState('');
  const [draftSubGenre, setDraftSubGenre] = useState('');
  const [draftSpecies, setDraftSpecies] = useState('');
  const [draftCommonName, setDraftCommonName] = useState('');

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + count) % count); setShowExif(false); setIsEditingTags(false); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % count); setShowExif(false); setIsEditingTags(false); };

  const handleEditTags = () => {
      setDraftGenre(photo.classification?.genre || '');
      setDraftSubGenre(photo.classification?.subGenre || '');
      setDraftSpecies(photo.classification?.species || '');
      setDraftCommonName(photo.classification?.commonName || '');
      setIsEditingTags(true);
  };

  const handleGenreChange = (e) => {
      const val = e.target.value;
      setDraftGenre(val);
      setDraftSubGenre('');
      
      if (val && !BIOLOGICAL_GENRES.includes(val) && val !== 'Other') {
          setDraftSpecies('N/A');
          setDraftCommonName('N/A');
      } else {
          if (draftSpecies === 'N/A') setDraftSpecies('');
          if (draftCommonName === 'N/A') setDraftCommonName('');
      }
  };

  const handleSaveTags = async () => {
    if (!photo.outingId || photo.outingId === '__global_pins__') {
        alert('Cannot edit tags for photos not associated with a specific outing.');
        setIsEditingTags(false);
        return;
    }
    
    try {
        const freshOutings = await getAllOutings();
        const out = freshOutings.find(o => o.id === photo.outingId);
        if (out) {
            const updatedClassification = { genre: draftGenre, subGenre: draftSubGenre, species: draftSpecies, commonName: draftCommonName };
            const updatedPhoto = { ...photo, classification: updatedClassification };
            if (updatedPhoto.classificationPending !== undefined) {
                delete updatedPhoto.classificationPending;
            }
            
            const updatedPhotos = out.photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
            await saveOuting({ ...out, photos: updatedPhotos });
            
            if (onSidebarUpdate) onSidebarUpdate(idx, updatedPhoto);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to save taxonomy updates natively.");
    }
    setIsEditingTags(false);
  };

  if (!photo) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <button
            onClick={() => { setShowExif(v => !v); setShowTools(false); }}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: showExif ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', transition: 'background-color 0.2s ease'
            }}
          >
            {showExif ? 'Hide Info' : 'Show Info'}
          </button>
          
          <button
            onClick={() => setShowTools(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: showTools ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', transition: 'background-color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            Tools {showTools ? '▲' : '▼'}
          </button>

          {showTools && (
            <div style={{
              position: 'absolute', top: '100%', left: '0', marginTop: '8px',
              backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
              borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, minWidth: '220px'
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSocial(v => !v); setShowTools(false); }}
                style={{
                  padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  backgroundColor: showSocial ? '#ff79c6' : 'transparent',
                  color: showSocial ? 'white' : 'var(--text-primary)', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = showSocial ? '#ff79c6' : 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = showSocial ? '#ff79c6' : 'transparent'}
              >
                {showSocial ? 'Hide Social Assistant' : 'Social Assistant'}
              </button>

              {photo.outingId && photo.outingId !== '__global_pins__' && onUnassociate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUnassociate(photo); setShowTools(false); }}
                  style={{
                    padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    backgroundColor: 'transparent', color: 'var(--text-primary)', textAlign: 'left'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Remove Outing Assignment
                </button>
              )}

              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  window.dispatchEvent(new Event('force-map-tab'));
                  window.dispatchEvent(new CustomEvent('activate-move-photos-mode', { detail: { photos: [photo] } }));
                  setShowTools(false);
                  if (onClose) onClose(); 
                }}
                style={{
                  padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  backgroundColor: 'transparent', color: 'var(--text-primary)', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Relocate on Map
              </button>
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{idx + 1} / {count}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', width: '100%', height: '100%', paddingTop: '52px' }} onClick={e => e.stopPropagation()}>
        <div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' }}
        >
          {/* Prev */}
        {count > 1 && (
          <button onClick={prev} style={{ position: 'absolute', left: '16px', zIndex: 2, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Photo + EXIF overlay container */}
        <div style={{ position: 'relative', maxWidth: 'calc(100% - 120px)', maxHeight: 'calc(100vh - 80px)', display: 'flex' }}>
          <img
            src={photo.data}
            alt={photo.text || 'Photo'}
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 80px)', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 10px 40px rgba(0,0,0,0.7)', display: 'block' }}
            onContextMenu={(e) => {
              if (window.require) {
                e.preventDefault();
                e.stopPropagation();
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('photo:show-context-menu', { 
                  origUrl: photo.data, 
                  thumbUrl: photo.thumb || photo.data 
                });
              }
            }}
          />

          {/* EXIF overlay – slides up from the bottom of the photo itself */}
          <div
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              maxHeight: showExif ? '70%' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
              borderRadius: '0 0 4px 4px',
              zIndex: 1
            }}
          >
            <div style={{
              background: 'rgba(8, 12, 18, 0.45)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              overflowY: 'auto',
              maxHeight: '100%',
              padding: '16px 20px'
            }}>
              {photo.outingTitle && photo.outingId !== '__global_pins__' && (
                 <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <span style={{ fontSize: '0.75rem' }}>📍</span> {photo.outingTitle}
                 </div>
              )}
              {photo.text && (
                <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{photo.text}</p>
              )}

              {/* TAXONOMY SECTION */}
              <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginTop: '16px' }} onClick={e => e.stopPropagation()}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                     <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)' }}>AI Taxonomy</span>
                     {!isEditingTags ? (
                         <button onClick={handleEditTags} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Edit Tags</button>
                     ) : (
                         <div style={{ display: 'flex', gap: '8px' }}>
                             <button onClick={(e) => { e.stopPropagation(); setIsEditingTags(false); }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                             <button onClick={(e) => { e.stopPropagation(); handleSaveTags(); }} style={{ background: '#8957e5', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Save</button>
                         </div>
                     )}
                 </div>

                 {!isEditingTags ? (
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Genre</span>
                           <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{photo.classification?.genre || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Sub-Genre</span>
                           <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{photo.classification?.subGenre || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Species / Genus</span>
                           <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{photo.classification?.species || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Common Name</span>
                           <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{photo.classification?.commonName || 'N/A'}</span>
                        </div>
                     </div>
                 ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                            <div>
                               <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '4px' }}>Genre</label>
                               <input list="lightbox-genre-list" value={draftGenre} onChange={handleGenreChange} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.85rem' }} />
                               <datalist id="lightbox-genre-list">{GENRE_OPTIONS.map(g => <option key={g} value={g} />)}</datalist>
                            </div>
                            <div>
                               <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '4px' }}>Sub-Genre</label>
                               <input list="lightbox-subgenre-list" value={draftSubGenre} onChange={e => setDraftSubGenre(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.85rem' }} />
                               <datalist id="lightbox-subgenre-list">{(SUBGENRE_MAP[draftGenre] || []).map(g => <option key={g} value={g} />)}</datalist>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                            <div>
                               <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '4px' }}>Species / Genus</label>
                               <input type="text" value={draftSpecies} onChange={e => setDraftSpecies(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                               <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: '4px' }}>Common Name</label>
                               <input type="text" value={draftCommonName} onChange={e => setDraftCommonName(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.85rem' }} />
                            </div>
                        </div>
                     </div>
                 )}
              </div>


              {photo.exif ? (() => {
                const e = photo.exif;
                const rows = [
                  (e.cameraMake || e.cameraModel) && ['📷 Camera', [e.cameraMake, e.cameraModel].filter(Boolean).join(' ')],
                  (e.lensMake || e.lensModel) && ['Lens', [e.lensMake, e.lensModel].filter(Boolean).join(' ')],
                  e.focalLength && ['Focal Length', `${e.focalLength}mm${e.focalLength35mm ? ` (${e.focalLength35mm}mm eq.)` : ''}`],
                  e.dateTaken && ['Taken', new Date(e.dateTaken).toLocaleString()],
                  e.aperture && ['Aperture', `f/${e.aperture}`],
                  e.shutterSpeed && ['Shutter', e.shutterSpeed >= 1 ? `${e.shutterSpeed}s` : `1/${Math.round(1 / e.shutterSpeed)}s`],
                  e.iso && ['ISO', e.iso],
                  e.exposureComp !== undefined && ['Exp. Comp', `${e.exposureComp} EV`],
                  e.meteringMode && ['Metering', e.meteringMode],
                  e.focusMode && ['Focus', e.focusMode],
                ].filter(Boolean);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                    {rows.map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>No EXIF data available.</p>
              )}
            </div>
          </div>
        </div>

        {count > 1 && (
          <button onClick={next} style={{ position: 'absolute', right: '16px', zIndex: 2, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <ChevronRightIcon size={24} />
          </button>
        )}

        {/* Detached Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
            title="Delete Photo"
            style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10, width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: 'rgba(255,60,60,0.15)', color: '#ff8888', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,60,60,0.8)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,60,60,0.15)'; e.currentTarget.style.color = '#ff8888'; }}
          >
            <Trash2 size={20} />
          </button>
        )}
        </div>
        
        {/* Sidebar */}
        {showSocial && (
          <SocialMediaAssistantSidebar 
            photo={photo} 
            outingId={photo.outingId} 
            onUpdate={(updatedPhoto) => {
               if (onSidebarUpdate) onSidebarUpdate(idx, updatedPhoto);
            }} 
          />
        )}
      </div>
    </div>
  );
}
