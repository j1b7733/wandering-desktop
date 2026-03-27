import React, { useState, useEffect } from 'react';
import { getAllJournals, getAllOutings, deleteJournal } from '../utils/storage';
import { Clock, Image as ImageIcon, MapPin, Trash2, Edit3, X } from 'lucide-react';
import PhotoLightbox from '../components/PhotoLightbox';

export default function JournalView({ setSelectedOutingId, setActiveTab }) {
  const [journals, setJournals] = useState([]);
  const [outingsMap, setOutingsMap] = useState({});
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const loadData = async () => {
    const rawJournals = await getAllJournals();
    const rawOutings = await getAllOutings();

    const oMap = {};
    rawOutings.forEach(o => { oMap[o.id] = o; });

    setJournals(rawJournals);
    setOutingsMap(oMap);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('journal-updated', loadData);
    return () => window.removeEventListener('journal-updated', loadData);
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this journal entry?")) {
       await deleteJournal(id);
       loadData();
    }
  };

  if (journals.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <h2 style={{ margin: '0 0 12px', color: 'var(--text-primary)' }}>No Journal Entries Yet</h2>
          <button 
             className="btn btn-primary"
             onClick={() => window.dispatchEvent(new CustomEvent('open-journal-editor', { detail: { journal: null } }))}
             style={{ marginTop: '16px' }}
          >
             <Edit3 size={16} /> Create Journal Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
          Wandering Journal
        </h1>
        <button 
           className="btn btn-primary"
           onClick={() => window.dispatchEvent(new CustomEvent('open-journal-editor', { detail: { journal: null } }))}
        >
           <Edit3 size={16} /> Create Entry
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {journals.map(entry => {
          const associatedOuting = entry.outingId ? outingsMap[entry.outingId] : null;

          return (
            <article key={entry.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #eaeaea', position: 'relative' }}>
              
              <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px' }}>
                <button 
                   onClick={() => window.dispatchEvent(new CustomEvent('open-journal-editor', { detail: { journal: entry } }))}
                   style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
                   title="Edit Post"
                >
                   <Edit3 size={18} />
                </button>
                <button 
                   onClick={() => handleDelete(entry.id)}
                   style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb' }}
                   title="Delete Post"
                >
                   <Trash2 size={18} />
                </button>
              </div>

              <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '2rem', margin: '0 0 12px', color: '#111', lineHeight: '1.2' }}>{entry.title || "Untitled Entry"}</h2>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem', color: '#666', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> 
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  
                  {associatedOuting && (
                    <button 
                       onClick={() => {
                          setSelectedOutingId(entry.outingId);
                          setActiveTab('map');
                       }}
                       style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(43,212,130,0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '12px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      <MapPin size={12} /> {associatedOuting.title || 'Attached Outing'}
                    </button>
                  )}
                </div>
              </header>

              <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
                {entry.body}
              </div>

              {entry.photos && entry.photos.length > 0 && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '24px' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <ImageIcon size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 
                    Attached Media
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {entry.photos.map(photo => (
                      <div 
                        key={photo.id} 
                        onClick={() => setFullScreenImage({ photos: entry.photos, startIndex: entry.photos.findIndex(p => p.id === photo.id) })}
                        style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f9f9f9', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <img src={photo.thumb || photo.data} alt="Journal Attachment" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {fullScreenImage && (
        <PhotoLightbox
          photos={fullScreenImage.photos}
          startIndex={fullScreenImage.startIndex}
          onClose={() => setFullScreenImage(null)}
        />
      )}
    </div>
  );
}
