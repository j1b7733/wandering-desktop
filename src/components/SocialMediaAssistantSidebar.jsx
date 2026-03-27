import React, { useState, useEffect, useRef } from 'react';
import { updatePhotoSocial, saveSetting, getSetting } from '../utils/storage';
import { generateChatResponse } from '../utils/gemini';
import { Settings, Send, CheckCircle, Circle, ArrowDownToLine, Check, Edit3, Image as ImageIcon } from 'lucide-react';

// Only load electron modules if available
let fs, path, os, nativeImage;
if (typeof window !== 'undefined' && window.require) {
  try {
    fs = window.require('fs');
    path = window.require('path');
    os = window.require('os');
    nativeImage = window.require('electron').nativeImage;
  } catch (e) {
    console.warn('Failed to require Node modules: ', e);
  }
}

export default function SocialMediaAssistantSidebar({ photo, outingId, onUpdate }) {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showGemini, setShowGemini] = useState(false);
  const platforms = ['flickr', 'vero', 'facebook', 'instagram'];
  const [activeTab, setActiveTab] = useState('instagram');
  const [socialData, setSocialData] = useState({});
  
  // Conversational state
  const [chatHistories, setChatHistories] = useState({});
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  
  const [lastExportPath, setLastExportPath] = useState('');
  const [includePhoto, setIncludePhoto] = useState(false);

  useEffect(() => {
    const load = async () => {
      const key = await getSetting('geminiApiKey');
      if (key) setApiKey(key);
    };
    load();
    setSocialData(photo.social || {});
    // Reset chat history when photo changes intentionally so old prompts don't mix visually 
    setChatHistories({});
    setChatInput('');
  }, [photo.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistories, loading, activeTab]);

  const handleSaveApiKey = async () => {
    await saveSetting('geminiApiKey', apiKey);
    setShowSettings(false);
  };

  const currentHistory = chatHistories[activeTab] || [];

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    let imagePayload = null;
    if (includePhoto) {
      try {
        const rawData = photo.thumbnail || photo.data;
        if (rawData && rawData.startsWith('data:image')) {
          const matches = rawData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
          if (matches) {
            imagePayload = { mimeType: matches[1], data: matches[2] };
          }
        } else if (rawData && fs && rawData.startsWith('file://')) {
          const buf = fs.readFileSync(rawData.replace('file://', ''));
          imagePayload = { mimeType: 'image/jpeg', data: buf.toString('base64') };
        } else if (rawData && fs) {
          const buf = fs.readFileSync(rawData);
          imagePayload = { mimeType: 'image/jpeg', data: buf.toString('base64') };
        }
      } catch (err) {
        console.error("Failed to load photo context:", err);
      }
    }

    const userMessage = { role: 'user', content: chatInput.trim(), image: imagePayload };
    const newHistory = [...currentHistory, userMessage];
    
    setChatHistories(prev => ({ ...prev, [activeTab]: newHistory }));
    setChatInput('');
    setLoading(true);

    try {
      const text = await generateChatResponse(apiKey, activeTab, newHistory);
      setChatHistories(prev => ({
        ...prev,
        [activeTab]: [...newHistory, { role: 'model', content: text }]
      }));
    } catch (e) {
      console.error(e);
      setChatHistories(prev => ({
        ...prev,
        [activeTab]: [...newHistory, { role: 'model', content: `[Error: ${e.message}]` }]
      }));
    }
    setLoading(false);
  };

  const handleUpdateData = async (platform, data) => {
    try {
      const updated = await updatePhotoSocial(outingId, photo.id, platform, data);
      if (updated) {
        setSocialData(updated.social);
        updated.outingId = outingId; // explicitly retain it!
        if (onUpdate) onUpdate(updated);
      }
    } catch (e) {
      console.error("Failed to update db", e);
      alert("Error updating posting status: " + e.message);
    }
  };

  const togglePosted = (platform) => {
    const isPosted = !!socialData[platform]?.postDate;
    handleUpdateData(platform, { postDate: isPosted ? null : new Date().toISOString() });
  };

  const generateExifOverlay = async (photo, resizedBase64Url, outPath) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const e = photo.exif || {};
        const lines = [];
        if (e.cameraMake || e.cameraModel) lines.push(`📷 ${[e.cameraMake, e.cameraModel].filter(Boolean).join(' ')}`);
        if (e.lensMake || e.lensModel) lines.push(`Lens: ${[e.lensMake, e.lensModel].filter(Boolean).join(' ')}`);
        
        const settings = [];
        if (e.focalLength) settings.push(`${e.focalLength}mm${e.focalLength35mm ? ` (${e.focalLength35mm}mm eq.)` : ''}`);
        if (e.aperture) settings.push(`f/${e.aperture}`);
        if (e.shutterSpeed) settings.push(e.shutterSpeed >= 1 ? `${e.shutterSpeed}s` : `1/${Math.round(1 / e.shutterSpeed)}s`);
        if (e.iso) settings.push(`ISO ${e.iso}`);
        if (settings.length > 0) lines.push(settings.join(' | '));
        
        if (e.dateTaken) {
           lines.push(`Date: ${new Date(e.dateTaken).toLocaleDateString()}`);
        }

        if (lines.length === 0) {
           lines.push('No EXIF metadata available');
        }

        const fontSize = Math.max(16, Math.floor(img.width * 0.03)); 
        ctx.font = `${fontSize}px sans-serif`;
        const lineHeight = fontSize * 1.5;
        const padding = fontSize * 1.2;
        
        let maxWidth = 0;
        lines.forEach(line => {
           const w = ctx.measureText(line).width;
           if (w > maxWidth) maxWidth = w;
        });
        
        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2;
        const margin = fontSize;
        const startX = img.width - boxWidth - margin; // bottom right
        const startY = img.height - boxHeight - margin;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(startX, startY, boxWidth, boxHeight);
        
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
           ctx.fillText(line, startX + padding, startY + padding + i * lineHeight);
        });
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches) {
           const buffer = window.require('buffer').Buffer.from(matches[2], 'base64');
           fs.writeFileSync(outPath, buffer);
           resolve();
        } else {
           reject(new Error("Failed to extract dataURL"));
        }
      };
      img.onerror = reject;
      img.src = resizedBase64Url;
    });
  };

  const handlePrepareAll = async () => {
    if (!fs || !nativeImage) {
      alert("Export functionality is only available in the standalone Electron app, not the web preview. Please run the Windows app.");
      return;
    }

    try {
      const exportDir = path.join(os.homedir(), '.wandering-desktop', 'exports', 'prepared');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      let imagePathOrBuffer = photo.data;
      let finalImg = null;

      if (imagePathOrBuffer.startsWith('data:image')) {
        const matches = imagePathOrBuffer.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        const buffer = window.require('buffer').Buffer.from(matches[2], 'base64');
        finalImg = nativeImage.createFromBuffer(buffer);
      } else if (imagePathOrBuffer.startsWith('file://')) {
        const localPath = imagePathOrBuffer.replace('file://', '');
        finalImg = nativeImage.createFromPath(localPath);
      } else {
        finalImg = nativeImage.createFromPath(imagePathOrBuffer);
      }

      const size = finalImg.getSize();
      
      const originalName = photo.fileName || `photo_${photo.id || Date.now()}.jpg`;
      const baseName = path.basename(originalName, path.extname(originalName));

      // Facebook export
      let fbImg = finalImg;
      if (size.width > 1200) fbImg = finalImg.resize({ width: 1200, quality: "good" });
      const fbPicPath = path.join(exportDir, `${baseName}_facebook.jpg`);
      fs.writeFileSync(fbPicPath, fbImg.toJPEG(90));

      // Instagram export
      let igImg = finalImg;
      if (size.width > 1080) igImg = finalImg.resize({ width: 1080, quality: "good" });
      const igPicPath = path.join(exportDir, `${baseName}_instagram.jpg`);
      fs.writeFileSync(igPicPath, igImg.toJPEG(90));

      // Instagram EXIF overlay
      const igOverlayPicPath = path.join(exportDir, `${baseName}_instagram_data.jpg`);
      const igBase64Url = igImg.toDataURL();
      await generateExifOverlay(photo, igBase64Url, igOverlayPicPath);

      alert(`Success! Prepared photos for Facebook and Instagram saved to:\n${exportDir}`);
      setLastExportPath(exportDir);
    } catch (e) {
      console.error(e);
      alert("Failed to export: " + e.message);
    }
  };

  return (
    <div style={{ width: '400px', backgroundColor: 'var(--panel-bg)', height: '100%', borderLeft: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', zIndex: 10 }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Social Media Assistant</h3>
        <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <Settings size={18} />
        </button>
      </div>

      {showSettings && (
        <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px' }}>Gemini API Key</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={e => setApiKey(e.target.value)}
            style={{ width: '100%', marginBottom: '8px', padding: '6px', backgroundColor: 'var(--bg-primary)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px' }} 
          />
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveApiKey}>Save Key</button>
        </div>
      )}

      {/* Top Section: Checkboxes and Action */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Posting Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {['flickr', 'vero', 'facebook', 'instagram'].map(p => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={!!socialData[p]?.postDate} 
                  onChange={() => togglePosted(p)} 
                />
                <span style={{ textTransform: 'capitalize' }}>{p}</span>
                {socialData[p]?.postDate && <CheckCircle size={14} color="#50fa7b" />}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handlePrepareAll} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem' }}>
          <ArrowDownToLine size={16} /> Prepare for FB & IG
        </button>

        {lastExportPath && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: '#50fa7b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> Images Ready!
            </div>
            <button className="btn btn-outline" style={{ padding: '4px' }} onClick={() => {
              if (window.require) {
                window.require('electron').shell.showItemInFolder(lastExportPath);
              }
            }}>
              Open Export Folder
            </button>
          </div>
        )}

        <button 
          className="btn btn-outline" 
          onClick={() => setShowGemini(!showGemini)}
          style={{ marginTop: '8px' }}
        >
          {showGemini ? 'Hide Gemini Assistant' : 'Show Gemini Assistant'}
        </button>
      </div>

      {showGemini && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', overflowX: 'auto' }}>
            {platforms.map(p => (
              <button 
                key={p} 
                onClick={() => setActiveTab(p)}
                style={{ 
                  flex: 1, padding: '10px 8px', background: activeTab === p ? 'transparent' : 'rgba(0,0,0,0.1)',
                  border: 'none', borderBottom: activeTab === p ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === p ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', textTransform: 'capitalize', fontWeight: activeTab === p ? 'bold' : 'normal'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat History View */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-primary)' }}>
            {currentHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px', fontSize: '0.9rem' }}>
                Ask Gemini to draft a caption for {activeTab}.<br/>Example: "Draft a caption focusing on the lighting."
              </div>
            ) : (
              currentHistory.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ 
                    backgroundColor: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--panel-bg)',
                    padding: '10px 14px', borderRadius: '12px', borderBottomLeftRadius: msg.role === 'model' ? 0 : '12px',
                    borderBottomRightRadius: msg.role === 'user' ? 0 : '12px',
                    border: msg.role === 'model' ? '1px solid var(--panel-border)' : 'none',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    fontSize: '0.9rem', whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  
                  {msg.role === 'model' && !msg.content.startsWith('[Error') && (
                    <button 
                      onClick={() => handleUpdateData(activeTab, { caption: msg.content })}
                      style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={12} /> Set as Final Caption
                    </button>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 14px', backgroundColor: 'var(--panel-bg)', borderRadius: '12px', borderBottomLeftRadius: 0, border: '1px solid var(--panel-border)' }}>
                Gemini is thinking...
                <div style={{ display: 'inline-flex', marginLeft: '6px', gap: '2px' }}>
                  <span style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}>.</span>
                  <span style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}>.</span>
                  <span style={{ animation: 'bounce 1.4s infinite ease-in-out both' }}>.</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-bg)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={includePhoto} onChange={e => setIncludePhoto(e.target.checked)} />
              Include Photo Thumbnail in Context
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder={`Talk to Gemini for ${activeTab}...`}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--panel-border)', backgroundColor: 'var(--bg-primary)', color: 'white' }}
              />
              <button 
                onClick={handleSendChat} 
                disabled={loading || !chatInput.trim()}
                style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: loading || !chatInput.trim() ? 'not-allowed' : 'pointer', opacity: loading || !chatInput.trim() ? 0.5 : 1 }}
              >
                <Send size={16} style={{ marginLeft: '-2px' }} />
              </button>
            </div>
          </div>

          {/* Final Caption Editor */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', backgroundColor: 'rgba(0,0,0,0.15)', height: '180px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final Caption ({activeTab})</span>
              </div>
            </div>
            <textarea 
              value={socialData[activeTab]?.caption || ''} 
              onChange={e => {
                const newSocialData = { ...socialData };
                if (!newSocialData[activeTab]) newSocialData[activeTab] = {};
                newSocialData[activeTab].caption = e.target.value;
                setSocialData(newSocialData);
              }}
              onBlur={e => handleUpdateData(activeTab, { caption: e.target.value })}
              placeholder={`Your final caption for ${activeTab} will appear here. Hit "Set as Final Caption" above to populate it.`}
              style={{ width: '100%', flex: 1, padding: '8px', resize: 'none', backgroundColor: 'var(--bg-primary)', color: 'white', border: '1px solid var(--panel-border)', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
