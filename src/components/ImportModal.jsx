import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { parseKML } from '../utils/parser';
import { saveOuting, getAllOutings } from '../utils/storage';
import { fetchLocationName } from '../utils/geo';
import { UploadCloud, X } from 'lucide-react';
import JSZip from 'jszip';

export default function ImportModal({ onClose, onSuccess }) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [importResults, setImportResults] = useState(null); // { added: 0, skipped: 0 }
  const fileInputRef = useRef(null);

  const processAndSaveOuting = async (text, existingOutings) => {
     const outingData = parseKML(text);
     
     // Deduplication Check: Check if an outing with the EXACT SAME start time 
     // already exists in the database
     const isDuplicate = existingOutings.some(
         existing => new Date(existing.startTime).getTime() === new Date(outingData.startTime).getTime()
     );

     if (isDuplicate) {
         return { saved: null, duplicate: true };
     }

     // Dynamic Naming: If no formal location name exists (or it's the default "Wandering Hillbilly Outing" title),
     // Reverse geocode the first point to name the outing
     if (outingData.tracks && outingData.tracks.length > 0) {
        const firstPoint = outingData.tracks[0];
        const locName = await fetchLocationName(firstPoint.lat, firstPoint.lng);
        
        if (locName) {
            outingData.locationName = locName;
            const dateObj = new Date(outingData.startTime);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            outingData.title = `Outing at ${locName} on ${formattedDate}`;
        }
     } else if (!outingData.title || outingData.title.includes("Wandering Hillbilly")) {
        const dateObj = new Date(outingData.startTime);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        outingData.title = `Outing on ${formattedDate}`;
     }
     
     if (outingData.photos && outingData.photos.length > 0) {
         outingData.photos.forEach(p => p.classificationPending = true);
     }

     const saved = await saveOuting(outingData);
     return { saved, duplicate: false };
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setImportResults(null);
    
    try {
      const existingOutings = await getAllOutings();
      let addedCount = 0;
      let skippedCount = 0;
      let firstSaved = null;

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        // Read file content
        const content = await zip.loadAsync(file);
        const kmlFiles = Object.keys(content.files).filter(name => name.endsWith('.kml'));
        
        if (kmlFiles.length === 0) {
          throw new Error("No KML files found in the zip archive.");
        }

        for (const filename of kmlFiles) {
           const kmlText = await content.files[filename].async("string");
           const { saved, duplicate } = await processAndSaveOuting(kmlText, existingOutings);
           
           if (duplicate) {
               skippedCount++;
           } else if (saved) {
               addedCount++;
               if (!firstSaved) firstSaved = saved;
               existingOutings.push(saved); // Maintain duplication integrity dynamically across the running loop
           }
        }
        
        window.dispatchEvent(new Event('outing-imported'));
        setImportResults({ added: addedCount, skipped: skippedCount });
        if (addedCount > 0) {
            setTimeout(() => onSuccess(firstSaved), 2500); // Delay slightly to show results
        }

      } else {
        const text = await file.text();
        const { saved, duplicate } = await processAndSaveOuting(text, existingOutings);
        
        if (duplicate) {
           skippedCount++;
        } else if (saved) {
           addedCount++;
        }

        window.dispatchEvent(new Event('outing-imported'));
        setImportResults({ added: addedCount, skipped: skippedCount });
        if (saved) {
           setTimeout(() => onSuccess(saved), 2000);
        }
      }
      
    } catch (err) {
      console.error(err);
      setError("Failed to parse file. Make sure it was a .kml or .zip exported from Wandering.");
    } finally {
      setImporting(false);
    }
  };

  const modalContent = (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2>Import Outing</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        <div 
          style={{ 
            border: '2px dashed var(--panel-border)', 
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)',
            cursor: 'pointer'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Select KML File</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
            Choose a .kml file or a .zip batch export from your mobile Wandering app
          </p>
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".kml,.zip,application/vnd.google-earth.kml+xml,application/zip"
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            onClick={(e) => e.target.value = null}
            disabled={importing}
          />
        </div>

        {error && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(248, 81, 73, 0.1)', color: 'var(--danger-color)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {importResults && (
            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(43,212,130,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)' }}>Import Complete</h4>
                <div style={{ fontSize: '0.9rem', color: 'white' }}>
                    ✅ Added: {importResults.added} outing(s)<br/>
                    {importResults.skipped > 0 && <span style={{ color: 'var(--text-secondary)' }}>⚠️ Skipped: {importResults.skipped} duplicate(s)</span>}
                </div>
            </div>
        )}

        {importing && (
          <p style={{ marginTop: '16px', textAlign: 'center', color: 'var(--accent-primary)' }}>Parsing and saving to local database...</p>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
