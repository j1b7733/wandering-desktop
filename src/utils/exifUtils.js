import exifr from 'exifr';

/**
 * Extracts normalized EXIF data and GPS coordinates from a file or buffer.
 * Supports File objects in browsers and buffers/paths in Node environments.
 * @param {File|ArrayBuffer|Buffer|string} input - The image source to parse.
 * @returns {Promise<{exif: Object|null, gps: {latitude: number, longitude: number}|null}>}
 */
export async function extractExifFromFile(input) {
  let currentExif = null;
  let gps = null;

  try {
    // Determine the most reliable input type for exifr
    // If it's a File object from an <input type="file"> in Electron, it might have a .path
    // However, exifr works best with ArrayBuffer if .path isn't directly supported by the build.
    let parseInput = input;
    if (input instanceof File) {
      // In Electron apps, File objects have a .path property
      if (input.path) {
          try {
             const fs = window.require('fs');
             parseInput = fs.readFileSync(input.path);
          } catch (e) {
             // Fallback to ArrayBuffer if fs access fails
             parseInput = await input.arrayBuffer();
          }
      } else {
          parseInput = await input.arrayBuffer();
      }
    }

    const exifData = await exifr.parse(parseInput, [
      'DateTimeOriginal', 'ModifyDate', 'FNumber', 'ExposureTime', 'ISO',
      'ExposureCompensation', 'MeteringMode', 'ExposureProgram', 'FocusMode', 'ExposureMode',
      'Make', 'Model', 'LensModel', 'LensMake', 'FocalLength', 'FocalLengthIn35mmFormat'
    ]);
    
    gps = await exifr.gps(parseInput);

    if (exifData) {
      // Normalize dates to ISO Strings to prevent IndexedDB serialization issues
      let dateTakenStr = exifData.DateTimeOriginal;
      if (dateTakenStr instanceof Date && !isNaN(dateTakenStr)) {
          dateTakenStr = dateTakenStr.toISOString();
      } else if (typeof dateTakenStr === 'string' || typeof dateTakenStr === 'number') {
          const d = new Date(dateTakenStr);
          if (!isNaN(d)) dateTakenStr = d.toISOString();
      } else {
          dateTakenStr = undefined;
      }

      let dateEditedStr = exifData.ModifyDate;
      if (dateEditedStr instanceof Date && !isNaN(dateEditedStr)) {
          dateEditedStr = dateEditedStr.toISOString();
      } else if (typeof dateEditedStr === 'string' || typeof dateEditedStr === 'number') {
          const d = new Date(dateEditedStr);
          if (!isNaN(d)) dateEditedStr = d.toISOString();
      } else {
          dateEditedStr = undefined;
      }

      currentExif = {
        dateTaken: dateTakenStr,
        dateEdited: dateEditedStr,
        aperture: exifData.FNumber,
        shutterSpeed: exifData.ExposureTime,
        iso: exifData.ISO,
        exposureComp: exifData.ExposureCompensation,
        meteringMode: exifData.MeteringMode,
        cameraMode: exifData.ExposureProgram,
        focusMode: exifData.FocusMode, 
        shutterMode: exifData.ExposureMode,
        cameraMake: exifData.Make,
        cameraModel: exifData.Model,
        lensModel: exifData.LensModel,
        lensMake: exifData.LensMake,
        focalLength: exifData.FocalLength,
        focalLength35mm: exifData.FocalLengthIn35mmFormat
      };
    }
  } catch (err) {
    console.warn("Failed to parse EXIF:", err);
  }

  return { exif: currentExif, gps };
}
