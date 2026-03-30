import React, { useState } from 'react';
import { X, Map, Images, Smartphone, Database, Compass, Flag, Navigation } from 'lucide-react';

const SECTIONS = [
  { id: 'intro', icon: <Compass size={18} />, title: 'Introduction' },
  { id: 'map', icon: <Map size={18} />, title: 'The Map View' },
  { id: 'outings', icon: <Flag size={18} />, title: 'Managing Outings' },
  { id: 'geotag', icon: <Navigation size={18} />, title: 'Auto-Geotagging' },
  { id: 'gallery', icon: <Images size={18} />, title: 'Photo Gallery & Socials' },
  { id: 'mobile', icon: <Smartphone size={18} />, title: 'Mobile Tracking App' },
  { id: 'data', icon: <Database size={18} />, title: 'Backups & Data' }
];

export default function HelpModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('intro');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        width: '900px', height: '650px',
        borderRadius: '12px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderBottom: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-bg)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="logo.png" alt="Logo" style={{ width: '24px', height: '24px', filter: 'invert(1)' }} />
            Wandering - User Guide
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Sidebar Nav */}
          <div style={{
            width: '260px', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--panel-border)',
            padding: '16px 0', overflowY: 'auto'
          }}>
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 24px', border: 'none', background: activeSection === sec.id ? 'var(--accent-primary)' : 'transparent',
                  color: activeSection === sec.id ? '#fff' : 'var(--text-secondary)',
                  fontWeight: activeSection === sec.id ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s ease'
                }}
              >
                {sec.icon}
                {sec.title}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', backgroundColor: '#fcfcfc', color: '#333', lineHeight: '1.6' }}>
            
            {activeSection === 'intro' && (
              <div className="help-content">
                <h1 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Welcome to Wandering!</h1>
                <p>Wandering is a completely offline-first Desktop Hub engineered for explorers, hikers, and photographers. It allows you to ingest GPS terrain paths, document your notes, systematically manage massive wildlife photography collections, and track your gear metrics—all anchored strictly to real-world coordinate tracking.</p>
                <p>This dynamic library empowers you to recall exactly <em>where</em> you were, <em>when</em> you were there, and exactly <em>what</em> you saw through your lens.</p>
              </div>
            )}

            {activeSection === 'map' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>The Map View</h2>
                <p>The Map View is the core interactive dashboard of your library. From here, you can see all of your globally cached `Outings` sprawled across an interactive topography.</p>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><strong>Searching:</strong> Use the floating Search Bar on the top left to instantly fly the camera to any geographic location on Earth.</li>
                  <li><strong>Drawing Tracks:</strong> Click the "Draw Route" (Line) icon mapping tool to manually plot a trail you traveled without a GPS tracker.</li>
                  <li><strong>Adding Fast Photos:</strong> You can drop global un-associated photos onto the map blindly using the "Add Photo" tool. (These default to "Global Pins" instead of a specific outing.)</li>
                </ul>
              </div>
            )}

            {activeSection === 'outings' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Managing Outings</h2>
                <p>The dark Sidebar rigidly organizes your `Outings` organically grouped by Year and Month. They are the core organizational containers holding your data.</p>
                <h4 style={{ marginBottom: '4px' }}>Creating & Importing</h4>
                <p style={{ marginTop: 0 }}>You can manually "Create Outing" using the sidebar button, OR you can hit "Import KML/GPX" to instantly ingest GPS payload archives from your Mobile tracking unit.</p>
                <h4 style={{ marginBottom: '4px' }}>Dashboard Configuration</h4>
                <p style={{ marginTop: 0 }}>Select an outing from the sidebar to open its Dashboard on the right. Here you can attach notes, configure your <em>Gear List</em> checkmarks, or attach standalone audio journal files into the payload container!</p>
              </div>
            )}

            {activeSection === 'geotag' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Advanced Auto-Geotagging</h2>
                <p>If you imported a genuine KML track exported directly from the Wandering Mobile App, your track secretly contains millisecond precision <strong>GPS nodes</strong> embedded directly into the terrain curve.</p>
                <p>When you bulk import Photos taken on a dedicated DSLR camera (photos normally lacking internal GPS coordinates) natively into the Outing's Dashboard, Wandering will trigger the <strong>Auto-Geotag Algorithm!</strong></p>
                <p>The system scrapes the hidden <code>DateTaken</code> Timestamp off your DSLR image's EXIF data, surgically compares it against the millisecond array of the GPS terrain path, and <strong>snaps your photo instantly to the exact spot on the trail where you snapped the shutter!</strong></p>
              </div>
            )}

            {activeSection === 'gallery' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Photo Gallery & Socials</h2>
                <p>The Gallery View provides a massive high-level grid spanning your entire database.</p>
                <ul style={{ paddingLeft: '20px' }}>
                  <li><strong>Map Extent Filter:</strong> Use the Dashboard button to instantly filter the Gallery grid dropping any photos not physically located inside the bounds of your currently active Map screen!</li>
                  <li><strong>Bulk Select:</strong> Trigger `Bulk Select` to lasso hundreds of photos globally to shift them into new Outings or permanently purge them.</li>
                  <li><strong>Social Media Tracking:</strong> Inside the Photo Lightbox, you can leverage the Social Media Assistant on the right-hand panel. Tell the app if a photo is Drafted or Uploaded to Instagram, Facebook, Vero, or Flickr. Wandering magically superimposes highly visible colored tracking tags onto the photos directly within the Gallery grids so you can visually verify your social pipelines!</li>
                </ul>
              </div>
            )}

            {activeSection === 'mobile' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Mobile Tracking Companion</h2>
                <p>Wandering has a native Android companion application installable via Capacitor/Android Studio.</p>
                <p>The mobile app acts as the aggressive field-agent data collector. It securely bypasses your phone's battery optimization to record high-fidelity geospatial GPS strings natively in your pocket whilst your phone screen is off deep in the woods.</p>
                <p>When your hike is over, simply tap "Export KML" in the Android App, send the packaged `.kml` file back to your Computer, and drag it into the Desktop <em>Import</em> button!</p>
              </div>
            )}

            {activeSection === 'data' && (
              <div className="help-content">
                <h2 style={{ marginTop: 0, color: 'var(--accent-primary)' }}>Backups & Data Freedom</h2>
                <p>Your library is stored locally on your hard drive via standard IndexedDB protocol containers. At any time, use perfectly unified string-layer export loops to safeguard your memories.</p>
                <p>Use <strong>Tools &gt; Back Up Now...</strong> in the application Menubar top-left to generate a compressed standalone JSON object representing the entirety of your library. Keep this file safe! It comprehensively protects your entire system against catastrophe.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
