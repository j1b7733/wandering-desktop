import React, { useState } from 'react';
import { ChevronLeft, ChevronRight as ChevronRightIcon, X, Trash2 } from 'lucide-react';
import SocialMediaAssistantSidebar from './SocialMediaAssistantSidebar';

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
  const photo = photos[idx];
  const count = photos.length;

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + count) % count); setShowExif(false); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % count); setShowExif(false); };

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowExif(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: showExif ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
              color: 'white', transition: 'background-color 0.2s ease'
            }}
          >
            {showExif ? 'Hide Info' : 'Show Info'}
          </button>
          <button
            onClick={() => setShowSocial(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: showSocial ? '#ff79c6' : 'rgba(255,255,255,0.1)',
              color: 'white', transition: 'background-color 0.2s ease'
            }}
          >
            {showSocial ? 'Hide Social' : 'Social Assistant'}
          </button>
        </div>
        {photo.outingId && photo.outingId !== '__global_pins__' && onUnassociate && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnassociate(photo); }}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: 'transparent', color: 'white', marginLeft: '12px'
            }}
          >
            Move to Global Pins
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,60,60,0.5)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              backgroundColor: 'rgba(255,60,60,0.2)', color: '#ff8888', marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        )}
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
              {photo.text && (
                <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{photo.text}</p>
              )}

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

        {/* Next */}
        {count > 1 && (
          <button onClick={next} style={{ position: 'absolute', right: '16px', zIndex: 2, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <ChevronRightIcon size={24} />
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
