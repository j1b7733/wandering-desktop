import React, { useState, useEffect, useRef } from 'react';
import { getAllOutings, saveOuting } from '../utils/storage';
import { MapPin, ImagePlus, Eye, EyeOff, Route, RouteOff, ChevronDown, ChevronRight, Menu, PanelLeftClose, Info, ChevronsUpDown, Download, Camera, FileText } from 'lucide-react';
import OutingInfoModal from './OutingInfoModal';
import { extractExifFromFile } from '../utils/exifUtils';
import ImportModal from './ImportModal';

// ─────────────────────────────────────────────
//  Sidebar Structural Groups
// ─────────────────────────────────────────────
function SidebarMonthGroup({ label, outingsList, toggleVisibility, toggleTracksVisibility, handleRightClick, focusInfoModal, setSelectedOutingId, selectedOutingId, highlightedOutingId, collapseKey }) {
  const hasHighlighted = outingsList.some(o => o.id === highlightedOutingId);
  const [open, setOpen] = useState(false);

  // Collapse when collapseKey increments (unless a highlight is forcing us open)
  useEffect(() => {
    if (!hasHighlighted) setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseKey]);
  const highlightRef = useRef(null);

  // Force open and scroll when a highlight targets this group
  useEffect(() => {
    if (hasHighlighted) {
      setOpen(true);
      // Scroll after render
      const timer = setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [hasHighlighted, highlightedOutingId]);

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, padding: '4px 2px', textTransform: 'uppercase' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
        <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{outingsList.length}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', paddingLeft: '4px' }}>
          {outingsList.map(outing => {
            const isHighlighted = outing.id === highlightedOutingId;
            return (
              <div 
                key={outing.id}
                ref={isHighlighted ? highlightRef : null}
                className="outing-card"
                onClick={() => {
                  // Toggle: deselect if already selected, otherwise select
                  const isSelected = outing.id === selectedOutingId;
                  setSelectedOutingId(isSelected ? null : outing.id);
                  if (!isSelected) window.dispatchEvent(new CustomEvent('zoom-to-outing', { detail: outing.id }));
                }}
                onContextMenu={(e) => handleRightClick(e, outing)}
                title="Click to zoom and select filter. Right click to zoom map."
                style={{
                  // Highlight if this outing is the active gallery filter OR the map-event highlight
                  backgroundColor: (outing.id === selectedOutingId || outing.id === highlightedOutingId) ? 'rgba(137,87,229,0.15)' : 'rgba(255,255,255,0.02)',
                  outline: (outing.id === selectedOutingId || outing.id === highlightedOutingId) ? '1px solid var(--accent-primary)' : 'none',
                  borderRadius: (outing.id === selectedOutingId || outing.id === highlightedOutingId) ? 'var(--radius-md)' : undefined,
                  transition: 'background-color 0.3s'
                }}
              >
                <div className="flex-between">
                  <h3 style={{ fontSize: '0.95rem', lineHeight: '1.3' }}>{outing.title}</h3>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        className="btn-ghost" 
                        style={{ padding: '4px', opacity: outing.tracksVisible === false ? 0.4 : 0.8 }}
                        onClick={(e) => toggleTracksVisibility(e, outing)}
                        title={outing.tracksVisible === false ? "Show Route" : "Hide Route"}
                      >
                        {outing.tracksVisible === false ? <RouteOff size={14} /> : <Route size={14} />}
                      </button>
                      <button 
                        className="btn-ghost" 
                        style={{ padding: '4px', opacity: outing.visible === false ? 0.4 : 0.8 }}
                        onClick={(e) => toggleVisibility(e, outing)}
                        title={outing.visible === false ? "Show on Map" : "Hide Entirely"}
                      >
                        {outing.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button 
                        className="btn-ghost" 
                        style={{ padding: '4px', opacity: 0.8 }}
                        onClick={(e) => focusInfoModal(e, outing)}
                        title={"Show Information / Edit"}
                      >
                        <Info size={14} color="var(--accent-primary)"/>
                      </button>
                  </div>
                </div>
                <p style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(outing.startTime).toLocaleDateString()} at {new Date(outing.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {outing.photos?.length > 0 && (
                    <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                      <ImageIcon size={12} /> {outing.photos.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarYearGroup({ year, months, toggleVisibility, toggleTracksVisibility, handleRightClick, focusInfoModal, setSelectedOutingId, selectedOutingId, highlightedOutingId, collapseKey }) {
  const hasHighlighted = Object.values(months).flat().some(o => o.id === highlightedOutingId);
  const [open, setOpen] = useState(false);

  // Force open if a highlight targets this year, collapse when collapseKey changes
  useEffect(() => {
    if (hasHighlighted) setOpen(true);
  }, [hasHighlighted, highlightedOutingId]);

  useEffect(() => {
    if (!hasHighlighted) setOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseKey]);

  const total = Object.values(months).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={{ marginBottom: '12px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {year}
        <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{total}</span>
      </button>

      {open && (
        <div style={{ padding: '8px 0px 4px 8px' }}>
          {Object.entries(months)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([monthNum, outingsList]) => {
              const label = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString('default', { month: 'long' });
              return (
                <SidebarMonthGroup
                  key={monthNum}
                  label={label}
                  outingsList={outingsList}
                  toggleVisibility={toggleVisibility}
                  toggleTracksVisibility={toggleTracksVisibility}
                  handleRightClick={handleRightClick}
                  focusInfoModal={focusInfoModal}
                  setSelectedOutingId={setSelectedOutingId}
                  selectedOutingId={selectedOutingId}
                  highlightedOutingId={highlightedOutingId}
                  collapseKey={collapseKey}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ selectedOutingId, setSelectedOutingId }) {
  const [globalTracksVisible, setGlobalTracksVisible] = useState(() => {
     return localStorage.getItem('globalHideTracks') !== 'true';
  });
  const [groupedOutings, setGroupedOutings] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [highlightedOutingId, setHighlightedOutingId] = useState(null);
  const [collapseKey, setCollapseKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState(null);

  const handleScrapeMissingExif = async () => {
    // Only works in Desktop app
    if (!window.require) {
      alert('This feature is only available in the desktop application.');
      return;
    }
    
    try {
      const fs = window.require('fs');
      const data = await getAllOutings();
      let scrapedCount = 0;

      for (const outing of data) {
        if (!outing.photos || outing.photos.length === 0) continue;
        
        let outingUpdated = false;
        for (const photo of outing.photos) {
          if (photo.exif) continue; // Already has EXIF
          if (photo.data && photo.data.startsWith('file://')) {
            try {
              const localPath = photo.data.replace('file://', '');
              const buffer = fs.readFileSync(localPath);
              const { exif } = await extractExifFromFile(buffer);
              if (exif) {
                photo.exif = exif;
                outingUpdated = true;
                scrapedCount++;
              }
            } catch (err) {
              console.error('Failed to scrape EXIF for photo:', photo.id, err);
            }
          }
        }
        if (outingUpdated) {
          await saveOuting(outing);
        }
      }

      if (scrapedCount > 0) {
        alert(`Successfully scraped missing EXIF data for ${scrapedCount} photo(s).`);
        window.dispatchEvent(new Event('outing-imported'));
      } else {
        alert('No photo missing EXIF data was found.');
      }
    } catch (err) {
      console.error(err);
      alert('Error occurred while scanning for missing EXIF data.');
    }
  };

  const loadOutings = async () => {
    const data = await getAllOutings();
    
    // Immediately refresh the active Info Modal's prop if it's currently open to prevent stale renders
    setActiveInfoModal(prev => {
       if (!prev) return null;
       return data.find(o => o.id === prev.id) || prev;
    });
    
    // Explicit chronological sort (newest derived date first)
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Grouping
    const groups = {};
    sorted.filter(o => o.id !== '__global_pins__').forEach(outing => {
      const date = outing.date ? new Date(outing.date) : new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];
      groups[year][month].push(outing);
    });
    setGroupedOutings(groups);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOutings();
    
    // Listen for import events
    window.addEventListener('outing-imported', loadOutings);

    // Listen for pin-click requests to highlight an outing in the library
    const handleSelectOuting = (e) => {
      const id = e.detail;
      if (!id) return;
      setHighlightedOutingId(null); // reset first so same-id re-triggers useEffect
      requestAnimationFrame(() => setHighlightedOutingId(id));
    };
    window.addEventListener('select-outing-in-library', handleSelectOuting);

    return () => {
      window.removeEventListener('outing-imported', loadOutings);
      window.removeEventListener('select-outing-in-library', handleSelectOuting);
    };
  }, []);

  const toggleVisibility = async (e, outing) => {
    e.stopPropagation();
    const updated = { ...outing, visible: outing.visible === false ? true : false };
    await saveOuting(updated);
    loadOutings();
    window.dispatchEvent(new Event('outing-imported')); // Refresh map layers
  };

  const toggleTracksVisibility = async (e, outing) => {
    e.stopPropagation();
    const updated = { ...outing, tracksVisible: outing.tracksVisible === false ? true : false };
    await saveOuting(updated);
    loadOutings();
    window.dispatchEvent(new Event('outing-imported')); // Refresh map layers
  };

  const handleGlobalTracksToggle = (e) => {
    e.stopPropagation();
    const isNowVisible = !globalTracksVisible;
    setGlobalTracksVisible(isNowVisible);
    localStorage.setItem('globalHideTracks', isNowVisible ? 'false' : 'true');
    window.dispatchEvent(new Event('global-tracks-toggled'));
  };

  const handleRightClick = (e, outing) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('zoom-to-outing', { detail: outing.id }));
  };

  const focusInfoModal = (e, outing) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveInfoModal(outing);
  };

  if (!sidebarOpen) {
    return (
      <button 
        className="btn btn-primary"
        style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 9999, padding: '8px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
        onClick={() => setSidebarOpen(true)}
        title="Open Library"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <div className="sidebar" style={{ position: 'relative' }}>
      <button 
        className="btn-ghost"
        style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px', zIndex: 10 }}
        onClick={() => setSidebarOpen(false)}
        title="Hide Sidebar"
      >
        <PanelLeftClose size={20} />
      </button>

      <div className="sidebar-header" style={{ paddingRight: '40px' }}>
        <h1><MapPin size={24} color="var(--accent-primary)" /> Wandering</h1>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button 
                className="btn btn-ghost" 
                style={{ width: '100%', padding: '8px', opacity: globalTracksVisible ? 1 : 0.5, border: '1px solid var(--panel-border)' }}
                onClick={handleGlobalTracksToggle}
                title={globalTracksVisible ? "Hide All Tracks on Map" : "Show All Tracks on Map"}
            >
                {globalTracksVisible ? <><Route size={20} /> Hide Global Tracks</> : <><RouteOff size={20} /> Show Global Tracks</>}
            </button>
        </div>
      </div>
      
      <div className="sidebar-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            Your Library
          </h3>
          <button
            className="btn-ghost"
            style={{ padding: '3px 6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
            onClick={() => setCollapseKey(k => k + 1)}
            title="Collapse all groups"
          >
            <ChevronsUpDown size={13} /> Collapse All
          </button>
        </div>
        
        {Object.keys(groupedOutings).length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '32px' }}>
            No outings active yet. Check your mobile app imports or create one manually on the map!
          </p>
        ) : (
          Object.entries(groupedOutings)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, months]) => (
              <SidebarYearGroup 
                key={year}
                year={year}
                months={months}
                toggleVisibility={toggleVisibility}
                toggleTracksVisibility={toggleTracksVisibility}
                handleRightClick={handleRightClick}
                focusInfoModal={focusInfoModal}
                setSelectedOutingId={setSelectedOutingId}
                selectedOutingId={selectedOutingId}
                highlightedOutingId={highlightedOutingId}
                collapseKey={collapseKey}
              />
            ))
        )}
      </div>

      {activeInfoModal && (
        <OutingInfoModal 
          outing={activeInfoModal}
          onClose={() => setActiveInfoModal(null)}
        />
      )}

      {/* Tools Section at the bottom */}
      <div style={{ padding: '20px 0', borderTop: '1px solid var(--panel-border)' }}>
        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px', padding: '0 16px' }}>Tools</h3>
        <button
          onClick={() => setShowImport(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 16px',
            border: 'none', background: 'none',
            color: 'var(--text-primary)', cursor: 'pointer',
            textAlign: 'left', fontSize: '0.95rem'
          }}
        >
          <Download size={18} /> Import Sync
        </button>
        <button
          onClick={handleScrapeMissingExif}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 16px',
            border: 'none', background: 'none',
            color: 'var(--text-primary)', cursor: 'pointer',
            textAlign: 'left', fontSize: '0.95rem'
          }}
        >
          <Camera size={18} /> Scrape Missing EXIF Data
        </button>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-journal-editor', { detail: { journal: null } }));
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px 16px',
            border: 'none', background: 'none',
            color: 'var(--text-primary)', cursor: 'pointer',
            textAlign: 'left', fontSize: '0.95rem'
          }}
        >
          <FileText size={18} /> Create Journal Entry
        </button>
      </div>

      {showImport && (
        <ImportModal 
          onClose={() => setShowImport(false)} 
          onSuccess={() => {
            setShowImport(false);
            loadOutings();
          }}
        />
      )}
    </div>
  );
}
