import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, UploadCloud } from 'lucide-react';
import { extractExifFromFile } from '../utils/exifUtils';
import { getAllOutings, saveOuting } from '../utils/storage';

export default function PhotoEditorModal({ photo, defaultLocation, onClose, onSave }) {
  const [text, setText] = useState(photo?.text || '');
  const [lat, setLat] = useState(photo?.lat || defaultLocation.lat);
  const [lng, setLng] = useState(photo?.lng || defaultLocation.lng);
  const [imgData, setImgData] = useState(photo?.data || null);
  const [exifData, setExifData] = useState(photo?.exif || null);
  
  // Batch & Tagging State
  const [photoBatch, setPhotoBatch] = useState([]); // Array of parsed photo objects
  const [allOutings, setAllOutings] = useState([]);
  const [matchedOuting, setMatchedOuting] = useState(null);
  const [shouldTagOuting, setShouldTagOuting] = useState(true);
  
  const fileInputRef = useRef(null);

  React.useEffect(() => {
     getAllOutings().then(setAllOutings);
  }, []);

  // Haversine distance helper to ensure the matched photo actually belongs near the outing
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newBatch = [];
    let detectedMatch = null;

    for (const file of files) {
        // Extract EXIF data
        let currentExif = null;
        let currentLat = lat;
        let currentLng = lng;

        try {
          const { exif, gps } = await extractExifFromFile(file);

          if (exif) {
            currentExif = exif;
          }

          if (gps && !photo) {
            currentLat = gps.latitude;
            currentLng = gps.longitude;
          }

          // Chronological Tagging Check
          if (currentExif?.dateTaken) {
             const dt = new Date(currentExif.dateTaken).getTime();
             
             for (const outing of allOutings) {
                if (!outing.startTime) continue;
                
                // Add 2 hour buffer to Start and End times
                const outStart = new Date(outing.startTime).getTime() - (2 * 60 * 60 * 1000);
                // End time fallback if missing is start time + 4 hours
                const outEnd = outing.endTime ? (new Date(outing.endTime).getTime() + (2 * 60 * 60 * 1000)) : (outStart + (4 * 60 * 60 * 1000));

                if (dt >= outStart && dt <= outEnd) {
                   // Time matches. Verify distance if we have GPS and outing has tracks.
                   // If not, we still generously offer to tag it.
                   if (currentLat && outing.tracks?.length > 0) {
                      const dist = calculateDistance(currentLat, currentLng, outing.tracks[0].lat, outing.tracks[0].lng);
                      if (dist < 50000) { // Within 50km is a safe regional bound for an outing
                         detectedMatch = outing;
                      }
                   } else {
                      detectedMatch = outing;
                   }
                }
             }
          }

        } catch (err) {
          console.warn("Failed to parse EXIF:", err);
        }

        // Convert image to data URL base64
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
            text: '' // Note: global text input applies to first photo if single, or empty if batch
        });
    }

    if (detectedMatch) {
       setMatchedOuting(detectedMatch);
    }
    
    setPhotoBatch(newBatch);
    
    // Set view state for the first photo in the batch
    if (newBatch.length > 0) {
        setImgData(newBatch[0].data);
        setExifData(newBatch[0].exif);
        setLat(newBatch[0].lat);
        setLng(newBatch[0].lng);
    }
  };

  const handleSave = async () => {
    if (photoBatch.length === 0 && !imgData) return;

    const itemsToSave = photoBatch.length > 0 ? photoBatch : [{
      id: photo?.id || 'photo_' + Date.now(),
      text,
      data: imgData,
      exif: exifData,
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    }];

    // If tagging to an outing, append all photos to the matched outing document
    if (matchedOuting && shouldTagOuting) {
        const updatedOuting = { ...matchedOuting };
        if (!updatedOuting.photos) updatedOuting.photos = [];
        
        itemsToSave.forEach(p => {
             // Assign the global text input to the photos if provided
             if (text) p.text = text;
             updatedOuting.photos.push(p);
        });
        
        await saveOuting(updatedOuting);
    }

    // Fire a single onSave call with the full array so OutingView can accumulate all photos in one write
    itemsToSave.forEach(p => { if (text) p.text = text; });
    const wasTagged = !!(matchedOuting && shouldTagOuting && !photo);
    onSave(photoBatch.length > 1 ? itemsToSave : itemsToSave[0], wasTagged);
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2>{photo ? 'Edit Photo' : 'Add Processed Photo'}</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {!imgData ? (
          <div 
            style={{ 
              border: '2px dashed var(--panel-border)', 
              borderRadius: 'var(--radius-lg)',
              padding: '32px 24px',
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={40} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1rem' }}>Select Image</h3>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }} 
              multiple
              onChange={handleFileChange}
              onClick={(e) => e.target.value = null}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '16px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
            <img src={imgData} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
            
            {/* Batch UI Indicator */}
            {photoBatch.length > 1 && (
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'white' }}>
                   Batch: {photoBatch.length} photos
                </div>
            )}

            <button 
              className="btn btn-primary" 
              style={{ position: 'absolute', top: '8px', right: '8px', padding: '6px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              Change
            </button>
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
        )}

        {matchedOuting && !photo && (
           <div style={{ padding: '12px', background: 'rgba(43,212,130,0.1)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
               <input 
                  type="checkbox" 
                  checked={shouldTagOuting} 
                  onChange={(e) => setShouldTagOuting(e.target.checked)} 
                  style={{ marginTop: '4px', accentColor: 'var(--accent-primary)', transform: 'scale(1.2)' }}
               />
               <div style={{ fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>Outing Match Detected!</strong><br />
                  <span style={{ color: 'var(--text-secondary)' }}>
                     {photoBatch.length > 1 ? 'These photos fall' : 'This photo falls'} within the timeframe of <strong>{matchedOuting.title}</strong>. Want to formally tag {photoBatch.length > 1 ? 'them' : 'it'} to that outing?
                  </span>
               </div>
           </div>
        )}

        <div className="form-group">
          <label>Caption / Notes (applies to all in batch)</label>
          <input 
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            placeholder="A beautiful sunset..."
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Latitude {photoBatch.length > 1 && '(first map pin)'}</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Longitude {photoBatch.length > 1 && '(first map pin)'}</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!imgData}>
            <Save size={16} /> Save Photo
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
