import React, { useState, useEffect } from 'react';
import { getAllOutings } from '../utils/storage';
import { X, MapPin, Globe } from 'lucide-react';

export default function OutingSelectorModal({ onClose, onSelect, title = "Select Destination Outing" }) {
  const [outings, setOutings] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await getAllOutings();
      // Filter out global pins and sort newest to oldest
      const filtered = data
        .filter(o => o.id !== '__global_pins__')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setOutings(filtered);
    };
    load();
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '12px', marginBottom: '8px', borderStyle: 'dashed' }}
            onClick={() => onSelect('__global_pins__')}
          >
            <Globe size={18} style={{ marginRight: '8px' }} />
            Add to Global Pins (Unassociated)
          </button>

          <p style={{ margin: '8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Existing Outings</p>

          {outings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: '24px 0' }}>No active outings found.</p>
          ) : (
            outings.map(outing => (
              <button 
                key={outing.id}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                onClick={() => onSelect(outing.id)}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="var(--accent-primary)" />
                  {outing.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {new Date(outing.date).toLocaleDateString()} • {outing.photos ? outing.photos.length : 0} photos
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
