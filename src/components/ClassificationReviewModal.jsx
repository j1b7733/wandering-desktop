import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BrainCircuit, Check, SkipForward, Settings } from 'lucide-react';
import { getAllOutings, saveOuting, getSetting, saveSetting } from '../utils/storage';
import { generateClassificationData } from '../utils/gemini';

import { BIOLOGICAL_GENRES, GENRE_OPTIONS, SUBGENRE_MAP } from '../utils/taxonomy';

export default function ClassificationReviewModal({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingAi, setProcessingAi] = useState(false);
  
  // Editable classification states
  const [draftGenre, setDraftGenre] = useState('');
  const [draftSubGenre, setDraftSubGenre] = useState('');
  const [draftSpecies, setDraftSpecies] = useState('');
  const [draftCommonName, setDraftCommonName] = useState('');
  const [lastUsedTags, setLastUsedTags] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const key = await getSetting('geminiApiKey');
    if (key) setApiKey(key);

    const allOutings = await getAllOutings();
    const photosToReview = [];
    
    allOutings.forEach(outing => {
      if (outing.photos) {
        outing.photos.forEach(photo => {
          if (photo.classificationPending) {
            photosToReview.push({ photo, outing });
          }
        });
      }
    });

    // Sort chronologically (oldest first) based on EXIF or native timestamp gracefully
    photosToReview.sort((a, b) => {
        let da = a.photo.exif?.dateTaken || a.photo.timestamp || a.outing.date || 0;
        let db = b.photo.exif?.dateTaken || b.photo.timestamp || b.outing.date || 0;
        
        let tA = typeof da === 'string' && da.includes(':') && da.includes(' ') && !da.includes('T')
           ? new Date(da.replace(':', '-').replace(':', '-')).getTime() 
           : new Date(da).getTime();
           
        let tB = typeof db === 'string' && db.includes(':') && db.includes(' ') && !db.includes('T')
           ? new Date(db.replace(':', '-').replace(':', '-')).getTime() 
           : new Date(db).getTime();
           
        if (isNaN(tA)) tA = 0;
        if (isNaN(tB)) tB = 0;
        
        return tB - tA; // Return newest first (reverse chronological)
    });

    setPendingPhotos(photosToReview);
    setLoading(false);
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

  useEffect(() => {
    loadData();
  }, []);

  const runAnalysis = async () => {
    if (!apiKey) {
       setShowSettings(true);
       return;
    }
    const currentTask = pendingPhotos[currentIndex];
    if (!currentTask) return;

    setProcessingAi(true);
    try {
      // Extract base64 payload
      const photoData = currentTask.photo.data;
      let rawBase64 = photoData;
      let mime = "image/jpeg";
      
      if (photoData.startsWith('data:')) {
         const matches = photoData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
         if (matches) {
            mime = matches[1];
            rawBase64 = matches[2];
         }
      } else if (photoData.startsWith('file://')) {
         if (window.require) {
             const fs = window.require('fs');
             // Strip the protocol natively
             let localPath = photoData.replace('file://', '');
             // Ensure Windows drive formatting is clean
             if (localPath.startsWith('/')) {
                 localPath = localPath.substring(1);
             }
             
             const fileBuffer = fs.readFileSync(localPath);
             rawBase64 = fileBuffer.toString('base64');
             
             if (localPath.toLowerCase().endsWith('.png')) mime = 'image/png';
             else if (localPath.toLowerCase().endsWith('.webp')) mime = 'image/webp';
             else mime = 'image/jpeg';
         } else {
             // Browser fallback
             const res = await fetch(photoData);
             const blob = await res.blob();
             const reader = new FileReader();
             rawBase64 = await new Promise((resolve) => {
                 reader.onloadend = () => {
                     const base64data = reader.result;
                     const matches = base64data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
                     if (matches) {
                         mime = matches[1];
                         resolve(matches[2]);
                     } else {
                         resolve(base64data);
                     }
                 };
                 reader.readAsDataURL(blob);
             });
         }
      }

      const result = await generateClassificationData(apiKey, rawBase64, mime);
      
      setDraftGenre(result.genre || 'N/A');
      setDraftSubGenre(result.subGenre || 'N/A');
      setDraftSpecies(result.species || 'N/A');
      setDraftCommonName(result.commonName || 'N/A');

    } catch (err) {
      console.error(err);
      alert("Failed to analyze photo with Gemini. " + err.message);
    } finally {
      setProcessingAi(false);
    }
  };

  useEffect(() => {
    if (pendingPhotos.length > 0 && currentIndex < pendingPhotos.length) {
       // Clear form whenever we land on a new photo natively
       setDraftGenre('');
       setDraftSubGenre('');
       setDraftSpecies('');
       setDraftCommonName('');
    }
  }, [currentIndex, pendingPhotos]);

  const handleApprove = async () => {
    const task = pendingPhotos[currentIndex];
    const { photo, outing } = task;

    // Remove pending flag, attach classification strictly
    const updatedPhoto = { ...photo };
    delete updatedPhoto.classificationPending;
    updatedPhoto.classification = {
        genre: draftGenre,
        subGenre: draftSubGenre,
        species: draftSpecies,
        commonName: draftCommonName
    };

    // Fetch fresh state to prevent stale sequential overwrites in the same loop block!
    const freshOutings = await getAllOutings();
    const freshOuting = freshOutings.find(o => o.id === outing.id);
    
    if (freshOuting) {
        const updatedPhotos = freshOuting.photos.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
        const updatedOuting = { ...freshOuting, photos: updatedPhotos };
        await saveOuting(updatedOuting);
    }
    
    setLastUsedTags({
       genre: draftGenre,
       subGenre: draftSubGenre,
       species: draftSpecies,
       commonName: draftCommonName
    });
    
    // Move to next photo intrinsically
    if (currentIndex < pendingPhotos.length - 1) {
       setCurrentIndex(currentIndex + 1);
    } else {
       onClose(); // queue is empty
    }
  };

  const handleSkip = () => {
    if (currentIndex < pendingPhotos.length - 1) {
       setCurrentIndex(currentIndex + 1);
    } else {
       onClose();
    }
  };

  const handleUsePrevious = () => {
     if (lastUsedTags) {
        setDraftGenre(lastUsedTags.genre || '');
        setDraftSubGenre(lastUsedTags.subGenre || '');
        setDraftSpecies(lastUsedTags.species || '');
        setDraftCommonName(lastUsedTags.commonName || '');
     }
  };

  const currentTask = pendingPhotos[currentIndex];

  const modalContent = (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 100000, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-bg)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'white', fontSize: '1.2rem' }}>
          <BrainCircuit color="#8957e5" /> AI Taxonomy Review
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {pendingPhotos.length > 0 && (
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
               Photo {currentIndex + 1} of {pendingPhotos.length}
             </span>
          )}
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Settings size={20} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
      </div>

      {showSettings && (
         <div style={{ padding: '16px 24px', backgroundColor: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--panel-border)', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
             <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Gemini API Key</label>
                 <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="input-field" />
             </div>
             <button className="btn btn-outline" onClick={async () => { await saveSetting('geminiApiKey', apiKey); setShowSettings(false); }}>Save API Key</button>
         </div>
      )}

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Scanning library...</div>
      ) : pendingPhotos.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No pending photos left!</div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Main Photo View */}
          <div style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <img src={currentTask.photo.data} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
          </div>

          {/* Sidebar Review Tools */}
          <div style={{ width: '380px', backgroundColor: 'var(--panel-bg)', borderLeft: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                
                <div style={{ margin: '0 0 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Identification Data</h3>
                    {lastUsedTags && (
                        <button onClick={handleUsePrevious} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                            Use Previous
                        </button>
                    )}
                 </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Genre</label>
                        <input type="text" list="genre-list" className="input-field" value={draftGenre} onChange={handleGenreChange} placeholder="e.g. Wildlife, Landscape..." />
                        <datalist id="genre-list">
                            {GENRE_OPTIONS.map(g => <option key={g} value={g} />)}
                        </datalist>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Sub-Genre</label>
                        <input type="text" list="subgenre-list" className="input-field" value={draftSubGenre} onChange={e => setDraftSubGenre(e.target.value)} placeholder="e.g. Birds, Urban..." />
                        <datalist id="subgenre-list">
                            {(SUBGENRE_MAP[draftGenre] || []).map(g => <option key={g} value={g} />)}
                        </datalist>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Species / Genus</label>
                        <input type="text" className="input-field" value={draftSpecies} onChange={e => setDraftSpecies(e.target.value)} placeholder="Scientific name if biological..." />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Common Name</label>
                        <input type="text" className="input-field" value={draftCommonName} onChange={e => setDraftCommonName(e.target.value)} placeholder="Vernacular name if biological..." />
                    </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                     {!draftGenre && !processingAi && (
                         <button className="btn btn-outline" style={{ width: '100%', borderColor: '#8957e5', color: '#8957e5', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={runAnalysis}>
                             <BrainCircuit size={18} /> Analyze with Gemini
                         </button>
                     )}
                     {processingAi && (
                         <div style={{ color: '#8957e5', textAlign: 'center', fontWeight: 'bold' }}>Evaluating taxonomy...</div>
                     )}
                </div>

             </div>

             <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleSkip}>
                   Skip <SkipForward size={14}/>
                </button>
                <button className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleApprove}>
                   <Check size={16}/> Approve & Save
                </button>
             </div>
          </div>

        </div>
      )}

    </div>
  );

  return createPortal(modalContent, document.body);
}
