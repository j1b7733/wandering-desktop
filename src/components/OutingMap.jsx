import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-editable';
import 'leaflet/dist/leaflet.css';
import { Camera, FileText, ChevronLeft, ChevronRight, Trash2, ImagePlus, Search, X } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getAllOutings, saveOuting } from '../utils/storage';

// Fix typical React-Leaflet missing icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const createHtmlIcon = (iconElement, bgColor="#58a6ff") => {
  const htmlString = renderToStaticMarkup(iconElement);
  return L.divIcon({
    html: `<div style="background-color: ${bgColor}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">${htmlString}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const GLOBAL_PINS_ID = '__global_pins__';

const noteIcon = createHtmlIcon(<FileText size={18} color="white" />, "#2ea043");
const cameraIcon = createHtmlIcon(<Camera size={18} color="white" />, "#8957e5");

const logoIcon = L.divIcon({
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 4px 6px rgba(0,0,0,0.3);border:2px solid #8957e5;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <img src="logo.png" style="width:20px;height:20px;object-fit:contain;" />
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26]
});

// Component to handle map bounds adjusting
const MapBounds = ({ globalOutings, globalPhotos, globalHideTracks }) => {
  const map = useMap();
  const initialFitDone = useRef(false);
  
  useEffect(() => {
    if (!initialFitDone.current && (globalOutings.length > 0 || globalPhotos.length > 0)) {
      const bounds = L.latLngBounds([]);
      
      globalOutings.forEach(out => {
        if (out.visible !== false) {
          // Only include track bounds if tracks are globally/individually visible
          if (!globalHideTracks && out.tracksVisible !== false) {
            if (out.tracks) out.tracks.forEach(t => bounds.extend([t.lat, t.lng]));
          }
          if (out.notes) out.notes.forEach(n => bounds.extend([n.lat, n.lng]));
        }
      });
      globalPhotos.forEach(photo => bounds.extend([photo.lat, photo.lng]));
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
        initialFitDone.current = true;
      }
    }

    const handleZoomToOuting = (e) => {
      const id = e.detail;
      const o = globalOutings.find(x => x.id === id);
      if (!o) return;
      const bounds = L.latLngBounds([]);
      if (o.tracks) o.tracks.forEach(t => bounds.extend([t.lat, t.lng]));
      if (o.notes) o.notes.forEach(n => bounds.extend([n.lat, n.lng]));
      if (o.photos) o.photos.forEach(p => bounds.extend([p.lat, p.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    const handleZoomToGlobal = () => {
      const bounds = L.latLngBounds([]);
      globalOutings.forEach(out => {
        if (out.visible !== false) {
          if (!globalHideTracks && out.tracksVisible !== false) {
            if (out.tracks) out.tracks.forEach(t => bounds.extend([t.lat, t.lng]));
          }
          if (out.notes) out.notes.forEach(n => bounds.extend([n.lat, n.lng]));
        }
      });
      globalPhotos.forEach(photo => bounds.extend([photo.lat, photo.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    const handleRequestGalleryExtent = () => {
      const b = map.getBounds();
      window.dispatchEvent(new CustomEvent('apply-gallery-extent', { 
        detail: {
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest()
        } 
      }));
    };

    window.addEventListener('zoom-to-outing', handleZoomToOuting);
    window.addEventListener('zoom-to-global', handleZoomToGlobal);
    window.addEventListener('request-gallery-extent', handleRequestGalleryExtent);
    return () => {
      window.removeEventListener('zoom-to-outing', handleZoomToOuting);
      window.removeEventListener('zoom-to-global', handleZoomToGlobal);
      window.removeEventListener('request-gallery-extent', handleRequestGalleryExtent);
    };
  }, [map, globalOutings, globalPhotos, globalHideTracks]);
  
  return null;
};

// Component to catch map clicks
const MapClicker = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  return null;
};

// Floating address search bar component
const MapSearch = () => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(val)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    // Zoom to bounding box if available, otherwise fly to point
    if (item.boundingbox) {
      const [s, n, w, e] = item.boundingbox.map(Number);
      map.fitBounds([[s, w], [n, e]], { padding: [40, 40], maxZoom: 16 });
    } else {
      map.flyTo([lat, lng], 14, { duration: 1.2 });
    }
    setResults([]);
    setQuery(item.display_name.split(',')[0]);
  };

  // Stop map scroll/click events from leaking through the search box
  const stopProp = (e) => e.stopPropagation();

  return (
    <div
      onMouseDown={stopProp}
      onMouseUp={stopProp}
      onMouseMove={stopProp}
      onWheel={stopProp}
      onClick={stopProp}
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        width: '220px',
        fontFamily: 'inherit',
        opacity: 0.65,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => { if (document.activeElement !== inputRef.current) e.currentTarget.style.opacity = '0.65'; }}
      onFocusCapture={e => e.currentTarget.style.opacity = '1'}
      onBlurCapture={e => e.currentTarget.style.opacity = '0.65'}
    >
      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(4px)',
        borderRadius: results.length > 0 ? '7px 7px 0 0' : '7px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        padding: '5px 8px',
        gap: '5px',
      }}>
        <Search size={14} color="#999" style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          placeholder="Search location…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '0.82rem',
            background: 'transparent',
            color: '#333',
            minWidth: 0,
          }}
        />
        {loading && <span style={{ fontSize: '0.7rem', color: '#bbb' }}>…</span>}
        {query && !loading && (
          <button
            onClick={clearSearch}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#bbb' }}
            title="Clear"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(4px)',
          borderRadius: '0 0 7px 7px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}>
          {results.map((item, i) => (
            <div
              key={item.place_id}
              onClick={() => handleSelect(item)}
              style={{
                padding: '8px 12px',
                fontSize: '0.82rem',
                color: '#333',
                cursor: 'pointer',
                borderTop: i > 0 ? '1px solid #f0f0f0' : 'none',
                lineHeight: 1.35,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600 }}>{item.display_name.split(',')[0]}</span>
              <br />
              <span style={{ color: '#888', fontSize: '0.75rem' }}>
                {item.display_name.split(',').slice(1, 3).join(', ').trim()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to handle tracked lines being editable
const EditablePolyline = ({ tracks, editingTracks, onTrackChange }) => {
  const map = useMap();
  const polylineRef = useRef(null);

  useEffect(() => {
    // Enable Leaflet Editable on the map instance
    if (!map.editTools) {
      // eslint-disable-next-line react-hooks/immutability
      map.editTools = new L.Editable(map);
    }
  }, [map]);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    let selectedVertex = null;

    if (editingTracks) {
      polyline.enableEdit();
      
      const handleChange = () => {
        const latlngs = polyline.getLatLngs();
        onTrackChange(latlngs.map(ll => ({ lat: ll.lat, lng: ll.lng })));
      };

      const handleVertexMousedown = (e) => {
        selectedVertex = e.vertex;
      };

      const handleGlobalKeyDown = (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedVertex) {
          selectedVertex.delete();
          selectedVertex = null;
          handleChange();
        }
      };

      const handlePolylineDblClick = (e) => {
        L.DomEvent.stop(e);
        const latlngs = polyline.getLatLngs();
        let closestIdx = 0;
        let minDistance = Infinity;
        
        for (let i = 0; i < latlngs.length - 1; i++) {
          const p1 = map.latLngToLayerPoint(latlngs[i]);
          const p2 = map.latLngToLayerPoint(latlngs[i+1]);
          const p = map.latLngToLayerPoint(e.latlng);
          const dist = L.LineUtil.pointToSegmentDistance(p, p1, p2);
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = i + 1;
          }
        }
        
        latlngs.splice(closestIdx, 0, e.latlng);
        polyline.setLatLngs(latlngs);
        polyline.disableEdit();
        polyline.enableEdit();
        handleChange();
      };
      
      document.addEventListener('keydown', handleGlobalKeyDown);
      polyline.on('editable:vertex:dragend', handleChange);
      polyline.on('editable:vertex:deleted', handleChange);
      polyline.on('editable:vertex:new', handleChange);
      polyline.on('editable:vertex:mousedown', handleVertexMousedown);
      polyline.on('dblclick', handlePolylineDblClick);
      
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown);
        polyline.off('editable:vertex:dragend', handleChange);
        polyline.off('editable:vertex:deleted', handleChange);
        polyline.off('editable:vertex:new', handleChange);
        polyline.off('editable:vertex:mousedown', handleVertexMousedown);
        polyline.off('dblclick', handlePolylineDblClick);
      };
    } else {
      if (polyline.editEnabled()) {
        polyline.disableEdit();
      }
    }
  }, [editingTracks, onTrackChange, map]);

  if (!tracks || tracks.length === 0) return null;

  return (
    <Polyline 
      ref={polylineRef}
      positions={tracks.map(t => [t.lat, t.lng])} 
      color="var(--accent-primary)" 
      weight={4}
      opacity={0.8}
      lineCap="round"
      lineJoin="round"
    />
  );
};

// Carousel popup for a group of photos at the same map pin
const PhotoCarouselMarker = ({ pin, onFullscreen, onAddPhoto, onDeletePhoto, globalOutings }) => {
  const isGlobalPin = pin.photos.every(p => p.outingId === GLOBAL_PINS_ID);
  const pinIcon = isGlobalPin ? cameraIcon : logoIcon;
  const [idx, setIdx] = useState(0);
  const photo = pin.photos[idx];
  const count = pin.photos.length;

  let hoverTitle = "Photo";
  if (isGlobalPin && (photo.timestamp || photo.exif?.dateTaken)) {
    hoverTitle = new Date(photo.exif?.dateTaken || photo.timestamp).toLocaleDateString();
  } else if (!isGlobalPin) {
    const parentOuting = globalOutings?.find(o => o.id === photo.outingId);
    if (parentOuting) {
      const dateStr = new Date(parentOuting.startTime || parentOuting.date).toLocaleDateString();
      hoverTitle = `${parentOuting.title || 'Outing'} - ${dateStr}`;
    }
  }

  const handlePopupOpen = () => {
    if (!isGlobalPin) {
      const outingId = pin.photos[0]?.outingId;
      if (outingId) {
        window.dispatchEvent(new CustomEvent('select-outing-in-library', { detail: outingId }));
      }
    }
  };

  return (
    <Marker position={[pin.lat, pin.lng]} icon={pinIcon} title={hoverTitle} eventHandlers={{ popupopen: handlePopupOpen }}>
      <Popup zIndexOffset={100} className="custom-popup" maxWidth={300}>
        <div style={{ padding: '0px', width: '280px', overflow: 'hidden', borderRadius: '4px' }}>
          {/* Navigation Header (only shown when multiple photos share pin) */}
          {count > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#1a1a2e', color: 'white' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + count) % count); }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>{idx + 1} / {count}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % count); }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Photo Image */}
          {photo.data && (
            <img
              src={photo.thumb || photo.data}
              alt={`Photo ${idx + 1}`}
              loading="lazy"
              onClick={() => onFullscreen(photo.data)}
              style={{ width: '100%', maxHeight: '200px', display: 'block', backgroundColor: '#eee', objectFit: 'cover', cursor: 'pointer' }}
            />
          )}

          {/* Caption + Timestamp */}
          {(photo.text || photo.timestamp || photo.exif?.dateTaken) && (
            <div style={{ padding: '10px 12px', borderBottom: photo.exif ? '1px solid #eee' : 'none' }}>
              {photo.text && <p style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#555' }}>{photo.text}</p>}
              {(photo.timestamp || photo.exif?.dateTaken) && (
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>
                  🕐 {new Date(photo.exif?.dateTaken || photo.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* EXIF Metadata Panel */}
          {photo.exif && (
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#666', backgroundColor: '#f9f9f9', lineHeight: '1.6' }}>

              {/* Camera & Lens */}
              {(photo.exif.cameraMake || photo.exif.cameraModel) && (
                <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#444' }}>
                  📷 {[photo.exif.cameraMake, photo.exif.cameraModel].filter(Boolean).join(' ')}
                </div>
              )}
              {(photo.exif.lensMake || photo.exif.lensModel) && (
                <div style={{ marginBottom: '4px' }}>
                  <strong>Lens:</strong> {[photo.exif.lensMake, photo.exif.lensModel].filter(Boolean).join(' ')}
                </div>
              )}
              {photo.exif.focalLength && (
                <div style={{ marginBottom: '4px' }}>
                  <strong>Focal Length:</strong> {photo.exif.focalLength}mm
                  {photo.exif.focalLength35mm && ` (${photo.exif.focalLength35mm}mm eq.)`}
                </div>
              )}

              {/* Exposure */}
              {photo.exif.dateTaken && <div style={{ marginBottom: '2px' }}><strong>Taken:</strong> {new Date(photo.exif.dateTaken).toLocaleString()}</div>}
              {photo.exif.aperture && <div style={{ marginBottom: '2px' }}><strong>Aperture:</strong> f/{photo.exif.aperture}</div>}
              {photo.exif.shutterSpeed && (
                <div style={{ marginBottom: '2px' }}>
                  <strong>Shutter:</strong> {photo.exif.shutterSpeed >= 1 ? `${photo.exif.shutterSpeed}s` : `1/${Math.round(1 / photo.exif.shutterSpeed)}s`}
                </div>
              )}
              {photo.exif.iso && <div style={{ marginBottom: '2px' }}><strong>ISO:</strong> {photo.exif.iso}</div>}
              {photo.exif.exposureComp !== undefined && <div style={{ marginBottom: '2px' }}><strong>Exp. Comp:</strong> {photo.exif.exposureComp} EV</div>}
              {photo.exif.meteringMode && <div style={{ marginBottom: '2px' }}><strong>Metering:</strong> {photo.exif.meteringMode}</div>}
              {photo.exif.focusMode && <div style={{ marginBottom: '2px' }}><strong>Focus:</strong> {photo.exif.focusMode}</div>}
              {photo.exif.shutterMode && <div style={{ marginBottom: '2px' }}><strong>Exposure:</strong> {photo.exif.shutterMode}</div>}
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid #eee', backgroundColor: '#f0f0f0' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddPhoto(pin, photo.outingId); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0366d6' }}
            >
              <ImagePlus size={16} /> Add Photo
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeletePhoto(photo.outingId, photo.id); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#d73a4a' }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default function OutingMap({ outing, onMapClick, editingTracks, onTrackChange }) {
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [globalPhotos, setGlobalPhotos] = useState([]);
  const [globalOutings, setGlobalOutings] = useState([]);
  const [globalHideTracks, setGlobalHideTracks] = useState(() => {
    return localStorage.getItem('globalHideTracks') === 'true';
  });
  const [movingOutingId, setMovingOutingId] = useState(null);

  // Listen for the sidebar's global track toggle event
  useEffect(() => {
    const handleGlobalTrackToggle = () => {
      setGlobalHideTracks(localStorage.getItem('globalHideTracks') === 'true');
    };
    window.addEventListener('global-tracks-toggled', handleGlobalTrackToggle);
    return () => window.removeEventListener('global-tracks-toggled', handleGlobalTrackToggle);
  }, []);

  // Setup event listeners for move mode
  useEffect(() => {
    const handleActivateMove = (e) => setMovingOutingId(e.detail.outingId);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && movingOutingId) setMovingOutingId(null);
    };
    
    window.addEventListener('activate-move-outing-mode', handleActivateMove);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('activate-move-outing-mode', handleActivateMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [movingOutingId]);

  // Fetch all photos across all outings to display globally
  useEffect(() => {
    const fetchData = async () => {
      const allOutings = await getAllOutings();
      setGlobalOutings(allOutings);
      
      const allPhotos = [];
      allOutings.forEach(out => {
        if (out.photos && out.photos.length > 0) {
          out.photos.forEach(p => {
             allPhotos.push({ ...p, outingId: out.id });
          });
        }
      });
      setGlobalPhotos(allPhotos);
    };

    fetchData();

    // Listen to imports or changes to refresh global data
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('outing-imported', handleUpdate);
    return () => window.removeEventListener('outing-imported', handleUpdate);
  }, [outing]); // Re-fetch if current outing changes (e.g. photo added)

  const handleAddPhoto = (pin, outingId) => {
    window.dispatchEvent(new CustomEvent('request-add-photo-at-pin', { 
       detail: { lat: pin.lat, lng: pin.lng, outingId } 
    }));
  };

  const handleDeletePhoto = async (outingId, photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo from the map?')) return;
    
    // Find the outing
    const targetOuting = globalOutings.find(o => o.id === outingId);
    if (!targetOuting) return;

    // Filter out the photo
    const updatedOuting = { ...targetOuting };
    updatedOuting.photos = updatedOuting.photos.filter(p => p.id !== photoId);
    
    await saveOuting(updatedOuting);
    window.dispatchEvent(new Event('outing-imported')); // reloads active dashboard / map
  };

  const handleInternalMapClick = async (latlng) => {
    // If we're moving an entire outing
    if (movingOutingId) {
      const { getOuting, saveOuting } = await import('../utils/storage');
      const outingToMove = await getOuting(movingOutingId);
      if (outingToMove) {
        // Calculate centroid
        const pts = [
          ...(outingToMove.tracks || []),
          ...(outingToMove.notes || []),
          ...(outingToMove.photos || []),
        ].filter(p => p.lat != null && p.lng != null);
        
        let centroid = null;
        if (pts.length) {
          const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
          const cLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
          centroid = { lat: cLat, lng: cLng };
        }

        const dLat = centroid ? latlng.lat - centroid.lat : 0;
        const dLng = centroid ? latlng.lng - centroid.lng : 0;
        const shift = p => ({ ...p, lat: (p.lat || latlng.lat) + dLat, lng: (p.lng || latlng.lng) + dLng });

        outingToMove.photos = (outingToMove.photos || []).map(shift);
        outingToMove.tracks = (outingToMove.tracks || []).map(shift);
        outingToMove.notes = (outingToMove.notes || []).map(shift);

        await saveOuting(outingToMove);
        window.dispatchEvent(new Event('outing-imported'));
      }
      setMovingOutingId(null);
      return; // Stop normal click behaviour
    }

    // Otherwise, normal behavior (add pin)
    if (onMapClick) onMapClick(latlng);
  };

  // Deduplicate against the current outing's photos if it is defined, so we don't render duplicates.
  // Actually, standardizing: just map ALL photos globally. We do not need `outing.photos` below if `globalPhotos` holds everything!
  // Wait, if an outing IS selected, maybe we only want to MapBounds to the active outing's photos, but display all.
  
  // Actually, we can just render globalPhotos instead of outing.photos.

  // If no outing is selected and we are in global map mode, we still render.
  // if (!outing) return null; // We remove this so Dashboard can use it too.

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <MapContainer 
        center={[0, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Maps">
            <TileLayer
              attribution='&copy; Google Maps'
              url="http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street View">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark Theme">
            <TileLayer
              attribution='&copy; Stadia'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {globalOutings.filter(o => o.visible !== false).map(out => {
          const isActiveAndEditing = outing && outing.id === out.id && editingTracks;
          // Tracks are visible if neither the global toggle nor the per-outing toggle hides them
          const tracksVisible = !globalHideTracks && out.tracksVisible !== false;
          
          return (
            <React.Fragment key={out.id}>
              {out.tracks && out.tracks.length > 0 && tracksVisible && (
                isActiveAndEditing ? (
                  <EditablePolyline 
                    tracks={out.tracks} 
                    editingTracks={editingTracks} 
                    onTrackChange={onTrackChange} 
                  />
                ) : (
                  <Polyline 
                    positions={out.tracks.map(t => [t.lat, t.lng])} 
                    color="var(--accent-primary)" 
                    weight={out.id === outing?.id ? 5 : 3}
                    opacity={out.id === outing?.id ? 0.9 : 0.6}
                    lineCap="round"
                    lineJoin="round"
                  />
                )
              )}

              {out.notes && out.notes.map(note => (
                <Marker key={note.id} position={[note.lat, note.lng]} icon={noteIcon} title={note.text || 'Note'}>
                  <Popup zIndexOffset={100} className="custom-popup">
                    <div style={{ padding: '8px', minWidth: '200px' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#333' }}>{note.type === 'audio' ? '🎙️ Audio Note' : '📝 Journal Note'} {out.title ? `- ${out.title}` : ''}</h4>
                      {(note.timestamp) && (
                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#888' }}>
                          🕐 {new Date(note.timestamp).toLocaleString()}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#555', whiteSpace: 'pre-wrap' }}>{note.text}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}

        {/* Group photos by location and render a carousel popup per unique pin */}
        {(() => {
          // Cluster photos by rounded coordinates (within ~10m)
          const roundCoord = (v) => Math.round(v * 10000) / 10000;
          const pinMap = {};
          globalPhotos.forEach(photo => {
            const key = `${roundCoord(photo.lat)},${roundCoord(photo.lng)}`;
            if (!pinMap[key]) pinMap[key] = { lat: photo.lat, lng: photo.lng, photos: [] };
            pinMap[key].photos.push(photo);
          });

          return Object.entries(pinMap).map(([key, pin]) => (
            <PhotoCarouselMarker
              key={key}
              pin={pin}
              onFullscreen={setFullScreenImage}
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhoto}
              globalOutings={globalOutings}
            />
          ));
        })()}

        <MapBounds 
          globalOutings={globalOutings}
          globalPhotos={globalPhotos}
          globalHideTracks={globalHideTracks}
        />
        <MapClicker onMapClick={handleInternalMapClick} />
        <MapSearch />
      </MapContainer>

      {movingOutingId && (
        <div style={{
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--accent-primary)', color: 'white', padding: '12px 24px',
          borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', zIndex: 2000,
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'none'
        }}>
          Click anywhere on the map to place the outing
          <button 
            style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85rem' }}
            onClick={() => setMovingOutingId(null)}
          >
            Cancel
          </button>
        </div>
      )}

      {fullScreenImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => setFullScreenImage(null)}
          title="Click anywhere to close full screen"
        >
          <img src={fullScreenImage} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', top: '24px', right: '24px', color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
        </div>
      )}
    </div>
  );
}
