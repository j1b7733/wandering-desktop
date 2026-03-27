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
