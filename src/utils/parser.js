export const parseKML = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Error parsing XML');
  }

  // Find document name and description
  let title = 'Imported Outing';
  let desc = '';
  // Default to now, but attempt to parse
  let date = new Date().toISOString();
  
  // According to mobile export, the name is Wandering Hillbilly Outing - Date
  const docNameNode = xmlDoc.querySelector('Document > name');
  if (docNameNode) {
    title = docNameNode.textContent;
    // Attempt to extract date from strings like "Wandering Hillbilly Outing - 3/16/2026"
    const dateMatch = title.match(/-\s*([0-9/]+)/);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1]);
      if (!isNaN(parsedDate)) {
        date = parsedDate.toISOString();
      }
    }
  }
  
  let generalNote = '';
  const docDescNode = xmlDoc.querySelector('Document > description');
  if (docDescNode) {
    desc = docDescNode.textContent;
    const parts = desc.split('\nGeneral Notes:\n');
    if (parts.length > 1) {
      generalNote = parts[1].trim();
      desc = parts[0].trim(); // Remove general notes from main description
    }
  }

  // Track coordinates
  let tracks = [];
  const coordsNode = xmlDoc.querySelector('LineString > coordinates');
  if (coordsNode) {
    const coordsStr = coordsNode.textContent.trim().split(/\s+/);
    tracks = coordsStr.map(coord => {
      const [lng, lat] = coord.split(',').map(Number);
      return { lat, lng };
    });
  }

  // Parse Placemarks
  const placemarks = xmlDoc.querySelectorAll('Placemark');
  const notes = [];
  const photos = [];
  
  // Helper to extract CDATA or text from description
  const extractTextAndImage = (descHtml) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = descHtml; // Need to process CDATA contents safely
    
    let text = '';
    const p = wrapper.querySelector('p');
    if (p) text = p.textContent;
    
    let imgData = null;
    const img = wrapper.querySelector('img');
    if (img) imgData = img.src; // Usually data:image/jpeg;base64...
    
    return { text, imgData };
  };

  placemarks.forEach(pm => {
    const pmNameNode = pm.querySelector('name');
    const pmDescNode = pm.querySelector('description');
    const pointNode = pm.querySelector('Point > coordinates');
    const pmTimeNode = pm.querySelector('TimeStamp > when');
    
    const pmName = pmNameNode ? pmNameNode.textContent : '';
    let pmDesc = pmDescNode ? pmDescNode.textContent : '';
    // Often KML puts CDATA block in description which the textContent returns verbatim (without the <![CDATA[ wrap theoretically since JS XML parser drops CDATA node wrapper, leaving text)
    
    if (pmName === 'Path') return; // Path line handled by LineString
    
    let lat = 0, lng = 0;
    if (pointNode) {
      const [plng, plat] = pointNode.textContent.trim().split(',').map(Number);
      lat = plat; lng = plng;
    }

    // Parse per-Placemark timestamp, falling back to outing startTime
    let itemTimestamp = null;
    if (pmTimeNode && pmTimeNode.textContent) {
      let t = new Date(pmTimeNode.textContent);
      if (isNaN(t) && !isNaN(Number(pmTimeNode.textContent))) {
        t = new Date(Number(pmTimeNode.textContent));
      }
      if (!isNaN(t)) itemTimestamp = t.toISOString();
    }

    if (pmName.startsWith('Photo')) {
      // Photo parsing
      const { text, imgData } = extractTextAndImage(pmDesc);
      
      // If multiple photos at exact same spot later support, we id by timestamp.
      photos.push({
        id: 'imported_photo_' + Date.now() + Math.random(),
        lat, lng,
        text,
        data: imgData, // Base64 or local URL representation
        timestamp: itemTimestamp
      });
    } else if (pmName.startsWith('Note')) {
      // Note parsing
      notes.push({
        id: 'imported_note_' + Date.now() + Math.random(),
        lat, lng,
        text: pmDesc,
        timestamp: itemTimestamp
      });
    } else if (pmName.startsWith('Audio')) {
      // Audio recording — treat like a note with a special flag
      notes.push({
        id: 'imported_audio_' + Date.now() + Math.random(),
        lat, lng,
        text: pmDesc,
        timestamp: itemTimestamp,
        type: 'audio'
      });
    }
  });

  // Synthesize Start and End times
  let startTime = date;
  let endTime = date; // If no track data
  
  // Look for our newly injected explicit TimeStamp block from the mobile exporter
  const timeNode = xmlDoc.querySelector('Document > TimeStamp > when');
  if (timeNode && timeNode.textContent) {
      let parsedTime = new Date(timeNode.textContent);
      
      // If the incoming text was a raw numeric ID (e.g., '1772972144956' instead of ISO string), JS Date parse yields Invalid Date. Attempt raw integer cast.
      if (isNaN(parsedTime) && !isNaN(Number(timeNode.textContent))) {
          parsedTime = new Date(Number(timeNode.textContent));
      }
      
      if (!isNaN(parsedTime)) {
          startTime = parsedTime.toISOString();
          date = startTime; // Sync core date to the accurate explicit time as well
      }
  }
  
  if (tracks.length > 0) {
    // If we rely on the Date, or the explicit start time, we still need an endTime
    const end = new Date(startTime);
    end.setHours(end.getHours() + 2); // default guess 2 hours if missing explicit track-by-track times
    endTime = end.toISOString();
  }

  return {
    title,
    description: desc,
    date,
    startTime,
    endTime,
    tracks,
    notes,
    photos,
    generalNote
  };
};
