import JSZip from 'jszip';
import { initDB, saveSetting, getSetting } from './storage';

// Node modules (available in Electron with nodeIntegration: true)
let fs, path, os, ipcRenderer;
if (typeof window !== 'undefined' && window.require) {
  try {
    fs = window.require('fs');
    path = window.require('path');
    os = window.require('os');
    ipcRenderer = window.require('electron').ipcRenderer;
  } catch (e) {
    console.warn('backup.js: failed to require Node modules:', e);
  }
}

const getPhotoDir = () => path.join(os.homedir(), '.wandering-desktop', 'photos');
const getBackupDir = () => {
  const dir = path.join(os.homedir(), '.wandering-desktop', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/** Prune auto-backup folder, keeping only the 2 most recent .wbak files */
const pruneAutoBackups = () => {
  const dir = getBackupDir();
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('auto-') && f.endsWith('.wbak'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime); // newest first

  // Delete any beyond the 2 most recent
  files.slice(2).forEach(f => {
    try { fs.unlinkSync(path.join(dir, f.name)); } catch (_) { /* ignore */ }
  });
};

/** Read all data from IndexedDB */
const dumpDatabase = async () => {
  const db = await initDB();

  const outings = await db.getAll('outings');
  const journals = await db.getAll('journals');

  // Settings store uses arbitrary keys; iterate all
  const settings = {};
  const settingsTx = db.transaction('settings', 'readonly');
  let cursor = await settingsTx.store.openCursor();
  while (cursor) {
    settings[cursor.key] = cursor.value;
    cursor = await cursor.continue();
  }

  return { outings, journals, settings };
};

/** Clear and restore all data to IndexedDB */
const restoreDatabase = async (data) => {
  const db = await initDB();

  // Clear existing data
  await db.clear('outings');
  await db.clear('journals');
  await db.clear('settings');

  // Restore outings
  const outingsTx = db.transaction('outings', 'readwrite');
  await Promise.all(data.outings.map(o => outingsTx.store.put(o)));
  await outingsTx.done;

  // Restore journals
  const journalsTx = db.transaction('journals', 'readwrite');
  await Promise.all(data.journals.map(j => journalsTx.store.put(j)));
  await journalsTx.done;

  // Restore settings
  const settingsTx = db.transaction('settings', 'readwrite');
  await Promise.all(Object.entries(data.settings).map(([k, v]) => settingsTx.store.put(v, k)));
  await settingsTx.done;
};

/**
 * Export a backup to disk.
 * @param {string|null} filePath — explicit save path, or null for auto-backup location
 * @param {function} [onStatus] — optional status callback (string)
 */
export const exportBackup = async (filePath = null, onStatus = () => {}) => {
  if (!fs || !path || !os) throw new Error('Node.js modules not available');

  onStatus('Reading database…');
  const dbData = await dumpDatabase();

  onStatus('Collecting photo files…');
  const zip = new JSZip();
  const photosFolder = zip.folder('photos');
  // Note: thumbnails are NOT backed up — the app regenerates them automatically on restore.

  const photoDir = getPhotoDir();

  // Helper: convert a file:// URL to an absolute local path (handles Windows /C:/ prefix)
  const fileUrlToPath = (fileUrl) => {
    let p = fileUrl.replace(/^file:\/\//, '');
    // On Windows, file:///C:/... -> /C:/... -> C:/...
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) {
      p = p.slice(1);
    }
    return p.replace(/\//g, path.sep);
  };

  // Collect unique photo file paths (skip thumbs — regenerated on restore)
  const photoFiles = new Set();
  dbData.outings.forEach(outing => {
    if (!outing.photos) return;
    outing.photos.forEach(p => {
      if (p.data && p.data.startsWith('file://')) photoFiles.add(fileUrlToPath(p.data));
    });
  });

  // Add photos with STORE (no compression) — JPEGs/PNGs are already compressed;
  // re-compressing with DEFLATE wastes CPU with negligible or negative benefit.
  photoFiles.forEach(fp => {
    try {
      const data = fs.readFileSync(fp);
      photosFolder.file(path.basename(fp), data, { compression: 'STORE' });
    } catch (_) { /* file missing, skip */ }
  });

  // Serialize DB — strip leading file:// prefix from paths so restore is location-independent
  const portableData = JSON.parse(JSON.stringify(dbData));
  portableData.outings.forEach(outing => {
    if (!outing.photos) return;
    outing.photos.forEach(p => {
      // Portable photo path; thumb is cleared so the app regenerates it on restore
      if (p.data && p.data.startsWith('file://')) p.data = 'photos/' + path.basename(p.data.replace('file://', ''));
      if (p.thumb) p.thumb = null;
    });
  });

  zip.file('db.json', JSON.stringify(portableData, null, 2), {
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Determine output path
  const savePath = filePath || path.join(
    getBackupDir(),
    `auto-${new Date().toISOString().slice(0, 10)}.wbak`
  );

  // Stream the ZIP to disk; use DEFLATE only for db.json (text compresses well);
  // photos use STORE so no pointless re-compression overhead
  onStatus('Saving backup…');
  await new Promise((resolve, reject) => {
    zip.generateNodeStream({
      type: 'nodebuffer',
      compression: 'STORE',   // default for all files
      streamFiles: true,
    })
    .pipe(fs.createWriteStream(savePath))
    .on('finish', resolve)
    .on('error', reject);
  });

  // Compress db.json separately with DEFLATE — re-add with compression option
  // (JSZip per-file compression overrides the stream default, so db.json was already set above)

  // Record last auto-backup time
  await saveSetting('lastAutoBackup', new Date().toISOString());

  // Prune old auto-backups if this was an auto-backup
  if (!filePath) pruneAutoBackups();

  onStatus('Backup complete.');
  return savePath;
};

/**
 * Import/restore from a .wbak file.
 * @param {string} filePath
 * @param {function} [onStatus]
 */
export const importBackup = async (filePath, onStatus = () => {}) => {
  if (!fs || !path || !os) throw new Error('Node.js modules not available');

  onStatus('Reading backup file…');
  const zipData = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(zipData);

  onStatus('Extracting photos…');
  const photoDir = getPhotoDir();
  if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

  // Extract photos
  const photoExtract = [];
  zip.folder('photos').forEach((relPath, file) => {
    photoExtract.push(
      file.async('nodebuffer').then(buf => fs.writeFileSync(path.join(photoDir, relPath), buf))
    );
  });
  zip.folder('thumbs').forEach((relPath, file) => {
    photoExtract.push(
      file.async('nodebuffer').then(buf => fs.writeFileSync(path.join(photoDir, relPath), buf))
    );
  });
  await Promise.all(photoExtract);

  onStatus('Restoring database…');
  const dbJson = await zip.file('db.json').async('string');
  const portableData = JSON.parse(dbJson);

  // Rewrite portable paths back to absolute file:// paths on this machine
  const filePfx = `file://${photoDir.replace(/\\/g, '/')}/`;
  portableData.outings.forEach(outing => {
    if (!outing.photos) return;
    outing.photos.forEach(p => {
      if (p.data && p.data.startsWith('photos/')) p.data = filePfx + p.data.replace('photos/', '');
      if (p.thumb && p.thumb.startsWith('thumbs/')) p.thumb = filePfx + p.thumb.replace('thumbs/', '');
    });
  });

  await restoreDatabase(portableData);
  onStatus('Restore complete! Reloading…');
};

/** Show native save dialog for .wbak file */
export const showSaveDialog = async () => {
  if (!ipcRenderer) throw new Error('ipcRenderer not available');
  const defaultName = `wandering-backup-${new Date().toISOString().slice(0, 10)}.wbak`;
  const result = await ipcRenderer.invoke('dialog:showSaveDialog', {
    title: 'Save Backup',
    defaultPath: path.join(getBackupDir(), defaultName),
    filters: [{ name: 'Wandering Backup', extensions: ['wbak'] }],
  });
  return result.canceled ? null : result.filePath;
};

/** Show native open dialog for .wbak file */
export const showOpenDialog = async () => {
  if (!ipcRenderer) throw new Error('ipcRenderer not available');
  const result = await ipcRenderer.invoke('dialog:showOpenDialog', {
    title: 'Open Backup',
    filters: [{ name: 'Wandering Backup', extensions: ['wbak'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
};

/**
 * Check if auto-backup is due (every 5 days) and run silently if so.
 */
export const checkAndAutoBackup = async () => {
  try {
    const lastBackup = await getSetting('lastAutoBackup');
    if (lastBackup) {
      const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 5) return; // Not due yet
    }
    console.log('Auto-backup: running…');
    await exportBackup(null); // null = auto path
    console.log('Auto-backup: done');
  } catch (err) {
    console.warn('Auto-backup failed:', err);
  }
};
