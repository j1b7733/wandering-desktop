import { openDB } from 'idb';

const DB_NAME = 'WanderingDesktopDB';
const DB_VERSION = 2;

// Only safely try importing fs/path if running in Electron environment
let fs, path, os, Buffer;
if (typeof window !== 'undefined' && window.require) {
  try {
    fs = window.require('fs');
    path = window.require('path');
    os = window.require('os');
    Buffer = window.require('buffer').Buffer;
  } catch (e) {
    console.warn('Failed to require Node modules: ', e);
  }
}

const getPhotoDir = () => {
  if (!os || !path || !fs) return null;
  const photoDir = path.join(os.homedir(), '.wandering-desktop', 'photos');
  if (!fs.existsSync(photoDir)) {
    fs.mkdirSync(photoDir, { recursive: true });
  }
  return photoDir;
};

const processPhotosToDisk = async (outing) => {
  if (!outing.photos || !Array.isArray(outing.photos)) return false;
  
  let updated = false;
  const photoDir = getPhotoDir();
  if (!photoDir) return false;

  for (const photo of outing.photos) {
    let imageBufferToThumbnail = null;
    let fileName = null;

    if (photo.data && photo.data.startsWith('data:image/')) {
      try {
        const matches = photo.data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'jpg';
          imageBufferToThumbnail = Buffer.from(matches[2], 'base64');
          fileName = `${photo.id || Date.now() + Math.random().toString(36).substr(2, 5)}.${ext}`;
          const filePath = path.join(photoDir, fileName);
          fs.writeFileSync(filePath, imageBufferToThumbnail);
          photo.data = `file://${filePath.replace(/\\/g, '/')}`;
          updated = true;
        }
      } catch (err) {
        console.error('Failed to save photo to disk:', err);
      }
    } else if (photo.data && photo.data.startsWith('file://') && !photo.thumb) {
      try {
         const localPath = photo.data.replace('file://', '');
         imageBufferToThumbnail = fs.readFileSync(localPath);
         fileName = path.basename(localPath);
         updated = true;
      } catch (err) {
         console.error('Failed to read existing local photo for thumbnailing:', err);
      }
    }

    if (imageBufferToThumbnail && fileName) {
      try {
        const nativeImage = window.require('electron').nativeImage;
        const image = nativeImage.createFromBuffer(imageBufferToThumbnail);
        const thumb = image.resize({ width: 300, quality: "good" });
        const thumbBuffer = thumb.toJPEG(80);
        const thumbName = `thumb_${fileName}`;
        const thumbPath = path.join(photoDir, thumbName);
        fs.writeFileSync(thumbPath, thumbBuffer);
        photo.thumb = `file://${thumbPath.replace(/\\/g, '/')}`;
      } catch (e) {
        console.error('Failed to create thumbnail', e);
        photo.thumb = photo.data;
      }
    }
  }
  return updated;
};

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('outings')) {
        const store = db.createObjectStore('outings', { keyPath: 'id' });
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('journals')) {
        const store = db.createObjectStore('journals', { keyPath: 'id' });
        store.createIndex('date', 'date');
      }
    },
  });
};

export const saveOuting = async (outing) => {
  const db = await initDB();
  outing.updatedAt = new Date().toISOString();
  // If no ID, generate one
  if (!outing.id) {
    outing.id = 'outing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    outing.createdAt = outing.updatedAt;
  }
  
  // Extract and save photos to disk before storing to DB
  await processPhotosToDisk(outing);

  await db.put('outings', outing);
  return outing;
};

export const getAllOutings = async () => {
  const db = await initDB();
  const outings = await db.getAllFromIndex('outings', 'date');
  
  // Run migration inline: if any outing still contains base64 photos, or misses thumbnails, process them.
  for (const outing of outings) {
    if (outing.photos && outing.photos.some(p => (p.data && p.data.startsWith('data:image/')) || (p.data && p.data.startsWith('file://') && !p.thumb))) {
      // Small inline fix for existing `file://` missing `thumb`:
      // We will read the file and generate it during processPhotosToDisk if we adjust the function.
      // Easiest is to let processPhotosToDisk handle pure base64 migrations only.
      // Wait, let's fix processPhotosToDisk above to also handle missing thumbs for local files directly if needed,
      // but to preserve task size we just run the base64 migration here as cleanly written previously.
      const updated = await processPhotosToDisk(outing);
      if (updated) {
        await db.put('outings', outing);
      }
    }
  }

  // After inline migration, return from db or just use mapped array if small enough.
  // We'll just return the array we modified in-place since we called db.put anyway.
  return outings.reverse(); // Return newest first
};

export const getOuting = async (id) => {
  const db = await initDB();
  return db.get('outings', id);
};

export const deleteOuting = async (id) => {
  const db = await initDB();
  await db.delete('outings', id);
};

export const saveSetting = async (key, value) => {
  const db = await initDB();
  await db.put('settings', value, key);
};

export const getSetting = async (key) => {
  const db = await initDB();
  return db.get('settings', key);
};

export const updatePhotoSocial = async (outingId, photoId, platform, socialData) => {
  const db = await initDB();
  const outing = await db.get('outings', outingId);
  if (!outing || !outing.photos) return null;

  const photoIndex = outing.photos.findIndex(p => p.id === photoId || p.data.includes(photoId));
  if (photoIndex === -1) return null;

  if (!outing.photos[photoIndex].social) {
    outing.photos[photoIndex].social = {};
  }
  
  if (!outing.photos[photoIndex].social[platform]) {
    outing.photos[photoIndex].social[platform] = {};
  }

  outing.photos[photoIndex].social[platform] = {
    ...outing.photos[photoIndex].social[platform],
    ...socialData
  };

  await db.put('outings', outing);
  return outing.photos[photoIndex];
};

// Journal APIs
export const saveJournal = async (journal) => {
  const db = await initDB();
  journal.updatedAt = new Date().toISOString();
  if (!journal.id) {
    journal.id = 'journal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    journal.createdAt = journal.updatedAt;
  }
  if (!journal.date) {
    journal.date = journal.createdAt;
  }
  await db.put('journals', journal);
  return journal;
};

export const getAllJournals = async () => {
  const db = await initDB();
  const journals = await db.getAllFromIndex('journals', 'date');
  return journals.reverse(); // Newest first
};

export const getJournal = async (id) => {
  const db = await initDB();
  return db.get('journals', id);
};

export const deleteJournal = async (id) => {
  const db = await initDB();
  await db.delete('journals', id);
};
