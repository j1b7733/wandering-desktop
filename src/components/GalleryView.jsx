import React, { useState, useEffect } from 'react';
import { getAllOutings } from '../utils/storage';
import { ChevronDown, ChevronRight, X, ChevronLeft, ChevronRight as ChevronRightIcon, CheckCircle2, Circle, Trash2, Info, ChevronsUpDown, MapPin } from 'lucide-react';
import OutingSelectorModal from './OutingSelectorModal';
import SocialMediaAssistantSidebar from './SocialMediaAssistantSidebar';
import PhotoLightbox from './PhotoLightbox';

const getPlatformColor = (platform) => {
  switch(platform) {
    case 'flickr': return '#ff0084';
    case 'vero': return '#fff';
    case 'facebook': return '#1877f2';
    case 'instagram': return '#e1306c';
    default: return '#fff';
  }
};




// ─────────────────────────────────────────────
//  Collapsible Month Group
// ─────────────────────────────────────────────
function MonthGroup({ label, photos, onPhotoClick, selectionMode, selectedPhotos, onToggleSelect, showGalleryInfo, collapseKey, expandKey }) {
  const [open, setOpen] = useState(true);

  // Only collapse when collapseKey is explicitly incremented (not on first mount)
  useEffect(() => { if (collapseKey > 0) setOpen(false); }, [collapseKey]);
  // Force open when a filter is applied
  useEffect(() => { if (expandKey > 0) setOpen(true); }, [expandKey]);

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, padding: '6px 2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
        <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '4px', marginTop: '6px' }}>
          {photos.map((photo, i) => {
            const isSelected = selectedPhotos.has(photo.id);
            return (
              <div
                key={photo.id || i}
                onClick={(e) => {
                  if (selectionMode) {
                    e.stopPropagation();
                    onToggleSelect(photo);
                  } else {
                    onPhotoClick(photo, i);
                  }
                }}
                style={{ 
                  position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '4px', 
                  cursor: 'pointer', backgroundColor: 'var(--panel-bg)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  padding: isSelected ? '2px' : '0'
                }}
              >
                {selectionMode && (
                  <div style={{ position: 'absolute', top: '6px', left: '6px', zIndex: 10, color: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)', backgroundColor: isSelected ? 'white' : 'transparent', borderRadius: '50%' }}>
                    {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>
                )}
                {showGalleryInfo && photo.social && (
                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 6px', borderRadius: '6px' }}>
                    {['flickr', 'vero', 'facebook', 'instagram'].map(p => {
                      const iconText = p === 'flickr' ? 'FL' : p === 'vero' ? 'VR' : p === 'facebook' ? 'FB' : 'IG';
                      if (photo.social[p]?.postDate) {
                        return <div key={p} style={{ fontSize: '9px', fontWeight: 'bold', background: getPlatformColor(p), color: 'white', padding: '2px 4px', borderRadius: '3px' }} title={`Posted on ${new Date(photo.social[p].postDate).toLocaleString()}`} >{iconText}</div>
                      } else if (photo.social[p]?.caption) {
                        return <div key={p} style={{ fontSize: '9px', fontWeight: 'bold', background: 'rgba(0,0,0,0.8)', border: `1px solid ${getPlatformColor(p)}`, color: getPlatformColor(p), padding: '1px 3px', borderRadius: '3px' }} title={`Drafted for ${p}`} >{iconText}</div>
                      }
                      return null;
                    })}
                  </div>
                )}
                <img
                  src={photo.thumb || photo.data}
                  alt={photo.text || ''}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s ease' }}
                  onMouseEnter={e => { if(!selectionMode) e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseLeave={e => { if(!selectionMode) e.currentTarget.style.transform = 'scale(1)' }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Year Group
// ─────────────────────────────────────────────
function YearGroup({ year, months, onPhotoClick, selectionMode, selectedPhotos, onToggleSelect, showGalleryInfo, collapseKey, expandKey }) {
  const [open, setOpen] = useState(true);

  useEffect(() => { if (collapseKey > 0) setOpen(false); }, [collapseKey]);
  useEffect(() => { if (expandKey > 0) setOpen(true); }, [expandKey]);
  const total = Object.values(months).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={{ marginBottom: '16px', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--panel-bg)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem' }}
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        {year}
        <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{total} photo{total !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div style={{ padding: '8px 16px 12px' }}>
          {Object.entries(months)
            .sort(([a], [b]) => Number(b) - Number(a)) // newest month first
            .map(([monthNum, photos]) => {
              const label = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString('default', { month: 'long' });
              return (
                <MonthGroup
                  key={monthNum}
                  label={label}
                  photos={photos}
                  onPhotoClick={(photo, i) => onPhotoClick(photos, i)}
                  selectionMode={selectionMode}
                  selectedPhotos={selectedPhotos}
                  onToggleSelect={onToggleSelect}
                  showGalleryInfo={showGalleryInfo}
                  collapseKey={collapseKey}
                  expandKey={expandKey}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main GalleryView
// ─────────────────────────────────────────────
export default function GalleryView({ selectedOutingId, setSelectedOutingId, mapExtentBounds, setMapExtentBounds, setActiveTab }) {
  const [grouped, setGrouped] = useState({}); // { year: { month: [photos] } }
  const [lightbox, setLightbox] = useState(null); // { photos, startIndex }
  const [showGalleryInfo, setShowGalleryInfo] = useState(false);
  const [collapseKey, setCollapseKey] = useState(0);
  const [expandKey, setExpandKey] = useState(0);
  
  // Bulk selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Map()); // Map of id -> photo object
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSidebarUpdate = (idx, updatedPhoto) => {
    setLightbox(prev => {
      const newPhotos = [...prev.photos];
      newPhotos[idx] = updatedPhoto;
      return { ...prev, photos: newPhotos };
    });
    // This doesn't auto-update the heavily nested grouped state, but it updates the lightbox seamlessly.
    // The gallery list updates organically on next load.
  };

  const toggleSelect = (photo) => {
    setSelectedPhotos(prev => {
      const next = new Map(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.set(photo.id, photo);
      return next;
    });
  };

  const handleExecuteBulkMove = async (targetOutingId) => {
    const { saveOuting, getAllOutings } = await import('../utils/storage');
    const allOutings = await getAllOutings();

    // Separate photos by their origin outing
    const modificationsByOrigin = {};
    for (const photo of selectedPhotos.values()) {
      if (!modificationsByOrigin[photo.outingId]) modificationsByOrigin[photo.outingId] = [];
      modificationsByOrigin[photo.outingId].push(photo.id);
    }

    // Pull targeted photos OUT of origin outings
    for (const [originId, photoIds] of Object.entries(modificationsByOrigin)) {
      const originOuting = allOutings.find(o => o.id === originId);
      if (originOuting && originOuting.photos) {
        originOuting.photos = originOuting.photos.filter(p => !photoIds.includes(p.id));
        await saveOuting(originOuting);
      }
    }

    // Push targeted photos INTO destination
    let targetOuting = allOutings.find(o => o.id === targetOutingId);
    if (!targetOuting && targetOutingId === '__global_pins__') {
       targetOuting = { id: '__global_pins__', title: 'Global Pins', date: new Date().toISOString(), startTime: new Date().toISOString(), visible: true, tracks: [], notes: [], photos: [] };
    }
    if (targetOuting) {
      const payload = Array.from(selectedPhotos.values()).map(p => ({ ...p, outingId: undefined }));
      targetOuting.photos = [...(targetOuting.photos || []), ...payload];
      await saveOuting(targetOuting);
    }

    window.dispatchEvent(new Event('outing-imported'));
    setSelectionMode(false);
    setSelectedPhotos(new Map());
    setShowBulkModal(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedPhotos.size} photos?`)) return;
    const { saveOuting, getAllOutings } = await import('../utils/storage');
    const allOutings = await getAllOutings();

    // Separate photos by their origin outing
    const modificationsByOrigin = {};
    for (const photo of selectedPhotos.values()) {
      if (!modificationsByOrigin[photo.outingId]) modificationsByOrigin[photo.outingId] = [];
      modificationsByOrigin[photo.outingId].push(photo.id);
    }

    // Delete photos OUT of origin outings
    for (const [originId, photoIds] of Object.entries(modificationsByOrigin)) {
      const originOuting = allOutings.find(o => o.id === originId);
      if (originOuting && originOuting.photos) {
        originOuting.photos = originOuting.photos.filter(p => !photoIds.includes(p.id));
        await saveOuting(originOuting);
      }
    }

    window.dispatchEvent(new Event('outing-imported'));
    setSelectionMode(false);
    setSelectedPhotos(new Map());
  };

  const handleDeletePhoto = async (photo) => {
    if (!confirm('Are you sure you want to permanently delete this photo?')) return;
    const { getOuting, saveOuting } = await import('../utils/storage');
    
    const originalOuting = await getOuting(photo.outingId);
    if (originalOuting && originalOuting.photos) {
      originalOuting.photos = originalOuting.photos.filter(p => p.id !== photo.id);
      await saveOuting(originalOuting);
    }
    
    window.dispatchEvent(new Event('outing-imported'));
    setLightbox(null);
  };

  const handleUnassociate = async (photo) => {
    if (!confirm('Move this photo to Global Pins?')) return;
    const { getOuting, saveOuting } = await import('../utils/storage');
    
    // Remove from original outing
    const originalOuting = await getOuting(photo.outingId);
    if (originalOuting) {
      originalOuting.photos = originalOuting.photos.filter(p => p.id !== photo.id);
      await saveOuting(originalOuting);
    }
    
    // Add to __global_pins__
    const allOutings = await getAllOutings();
    let globalOuting = allOutings.find(o => o.id === '__global_pins__') || {
      id: '__global_pins__', title: 'Global Pins', date: new Date().toISOString(), startTime: new Date().toISOString(), visible: true, tracks: [], notes: [], photos: []
    };
    globalOuting.photos = [...(globalOuting.photos || []), { ...photo, outingId: undefined }];
    await saveOuting(globalOuting);
    
    window.dispatchEvent(new Event('outing-imported'));
    setLightbox(null); // Close lightbox to refresh
  };

  useEffect(() => {
    const load = async () => {
      const allOutings = await getAllOutings();
      const allPhotos = [];
      allOutings.forEach(out => {
        if (selectedOutingId && out.id !== selectedOutingId) return; // Filter to selected outing
        if (out.photos) {
          out.photos.forEach(photo => {
            let valid = true;
            if (mapExtentBounds) {
               if (photo.lat > mapExtentBounds.north || photo.lat < mapExtentBounds.south || photo.lng > mapExtentBounds.east || photo.lng < mapExtentBounds.west) {
                  valid = false;
               }
            }
            if (valid) {
               photo.outingId = out.id;
               allPhotos.push(photo);
            }
          });
        }
      });

      // Sort newest first
      allPhotos.sort((a, b) => {
        const da = a.exif?.dateTaken ? new Date(a.exif.dateTaken) : new Date(0);
        const db = b.exif?.dateTaken ? new Date(b.exif.dateTaken) : new Date(0);
        return db - da;
      });

      // Group by year → month
      const groups = {};
      allPhotos.forEach(photo => {
        const date = photo.exif?.dateTaken ? new Date(photo.exif.dateTaken) : null;
        const year = date ? date.getFullYear() : 'Unknown';
        const month = date ? String(date.getMonth() + 1).padStart(2, '0') : '00';
        if (!groups[year]) groups[year] = {};
        if (!groups[year][month]) groups[year][month] = [];
        groups[year][month].push(photo);
      });

      setGrouped(groups);
      // Force groups open whenever a filter is actively showing results
      if (selectedOutingId || mapExtentBounds) {
        setExpandKey(k => k + 1);
      }
    };

    load();
    window.addEventListener('outing-imported', load);
    return () => window.removeEventListener('outing-imported', load);
  }, [selectedOutingId, mapExtentBounds]);

  const visiblePhotos = Object.values(grouped).flatMap(months => Object.values(months).flat());
  const allSelected = visiblePhotos.length > 0 && selectedPhotos.size === visiblePhotos.length;
  
  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedPhotos(new Map());
    } else {
      const next = new Map();
      visiblePhotos.forEach(p => next.set(p.id, p));
      setSelectedPhotos(next);
    }
  };

  const totalPhotos = visiblePhotos.length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      
      {/* Sticky Bulk Action Bar */}
      {selectionMode && (
        <div style={{
           position: 'sticky', top: '-24px', left: 0, right: 0, zIndex: 100, marginBottom: '24px',
           backgroundColor: 'var(--accent-primary)', color: 'white', padding: '12px 24px',
           borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <span style={{ fontWeight: 'bold' }}>{selectedPhotos.size} photos selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-outline" 
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 12px' }}
              onClick={handleToggleSelectAll}
            >
              {allSelected ? <Circle size={16} style={{ marginRight: '6px' }} /> : <CheckCircle2 size={16} style={{ marginRight: '6px' }} />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              className="btn btn-outline" 
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 12px' }}
              disabled={selectedPhotos.size === 0}
              onClick={handleBulkDelete}
            >
              <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete
            </button>
            <button 
              className="btn btn-outline" 
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 12px' }}
              disabled={selectedPhotos.size === 0}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('activate-move-photos-mode', { 
                  detail: { photos: Array.from(selectedPhotos.values()) } 
                }));
                setActiveTab('map');
              }}
            >
              <MapPin size={16} style={{ marginRight: '6px' }} /> Move on Map
            </button>
            <button 
              className="btn" 
              style={{ backgroundColor: 'white', color: 'var(--accent-primary)', fontWeight: 'bold' }}
              disabled={selectedPhotos.size === 0}
              onClick={() => setShowBulkModal(true)}
            >
              Move to Outing
            </button>
            <button 
              className="btn btn-ghost" 
              style={{ color: 'white' }}
              onClick={() => { setSelectionMode(false); setSelectedPhotos(new Map()); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Photo Gallery</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{totalPhotos} photos</span>
            <button
              className="btn btn-outline"
              style={{ marginLeft: '4px', padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setCollapseKey(k => k + 1)}
              title="Collapse all year/month groups"
            >
              <ChevronsUpDown size={13} /> Collapse All
            </button>
            <button
              className={`btn ${showGalleryInfo ? 'btn-primary' : 'btn-outline'}`}
              style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '0.8rem' }}
              onClick={() => setShowGalleryInfo(!showGalleryInfo)}
            >
              Toggle Social Postings
            </button>
            {selectedOutingId && (
              <button
                className="btn btn-outline"
                style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => setSelectedOutingId(null)}
              >
                Show All Photos
              </button>
            )}
            {mapExtentBounds && (
              <button
                className="btn btn-outline"
                style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '0.8rem', color: '#ffb86c', borderColor: '#rgba(255,184,108,0.5)', backgroundColor: 'rgba(255,184,108,0.1)' }}
                onClick={() => setMapExtentBounds(null)}
              >
                Clear Map Filter
              </button>
            )}
          </div>
          
          {!selectionMode && totalPhotos > 0 && (
            <button 
              className="btn btn-outline" 
              onClick={() => setSelectionMode(true)}
            >
              <CheckCircle2 size={16} /> Bulk Select
            </button>
          )}
        </div>

        {totalPhotos === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '80px' }}>
            <p style={{ fontSize: '1.1rem' }}>No photos yet.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Import outings with photos, or add photos directly on the map.</p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => (a === 'Unknown' ? 1 : b === 'Unknown' ? -1 : Number(b) - Number(a)))
            .map(([year, months]) => (
              <YearGroup
                key={year}
                year={year}
                months={months}
                onPhotoClick={(photos, i) => setLightbox({ photos, startIndex: i })}
                selectionMode={selectionMode}
                selectedPhotos={selectedPhotos}
                onToggleSelect={toggleSelect}
                showGalleryInfo={showGalleryInfo}
                collapseKey={collapseKey}
                expandKey={expandKey}
              />
            ))
        )}
      </div>

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
          onUnassociate={handleUnassociate}
          onDelete={handleDeletePhoto}
          onSidebarUpdate={handleSidebarUpdate}
        />
      )}

      {showBulkModal && (
        <OutingSelectorModal
          title={`Move ${selectedPhotos.size} photos to...`}
          onClose={() => setShowBulkModal(false)}
          onSelect={handleExecuteBulkMove}
        />
      )}
    </div>
  );
}
