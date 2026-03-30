export const fetchLocationName = async (lat, lng) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
       headers: {
           // Providing user-agent to comply with OSM usage policy
           'User-Agent': 'WanderingDesktop/1.0'
       }
    });
    
    if (response.ok) {
        const data = await response.json();
        
        // Prioritize natural features over generic addresses when possible for nature photography
        if (data.address.park) return data.address.park;
        if (data.address.nature_reserve) return data.address.nature_reserve;
        if (data.address.forest) return data.address.forest;
        if (data.address.watercraft) return data.address.watercraft; // sometimes lakes/rivers
        if (data.address.village) return data.address.village;
        if (data.address.town) return data.address.town;
        if (data.address.city) return data.address.city;
        if (data.address.county) return data.address.county;
        
// Fallback to whatever display name they generate
        if (data.display_name) {
             const parts = data.display_name.split(',');
             return parts[0].trim();
        }
    }
    return null;
  } catch(e) {
      console.warn("Reverse geocoding failed", e);
      return null;
  }
};

export const getDistanceMeters = (p1, p2) => {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * rad;
  const dLon = (p2.lng - p1.lng) * rad;
  const lat1 = p1.lat * rad;
  const lat2 = p2.lat * rad;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const enrichTracksWithTime = (tracks, startTime, endTime) => {
   if (!tracks || !tracks.length) return [];
   // If the first track already has a valid timestamp, return as-is
   if (tracks[0].timestamp) return tracks;

   const startMs = new Date(startTime).getTime();
   let endMs = endTime ? new Date(endTime).getTime() : startMs + 2 * 60 * 60 * 1000;
   if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      endMs = startMs + 1000 * 60 * 60; // fallback +1 hr
   }
   
   // Calculate cumulative distances
   let totalDist = 0;
   const dists = [0];
   for (let i = 1; i < tracks.length; i++) {
       const d = getDistanceMeters(tracks[i-1], tracks[i]);
       totalDist += d;
       dists.push(totalDist);
   }

   return tracks.map((t, i) => {
       const ratio = totalDist > 0 ? dists[i] / totalDist : i / (tracks.length - 1 || 1);
       return {
           ...t,
           timestamp: startMs + ratio * (endMs - startMs)
       };
   });
};
