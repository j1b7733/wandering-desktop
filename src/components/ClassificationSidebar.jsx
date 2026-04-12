import React from 'react';
import { X, Filter, Target } from 'lucide-react';

export default function ClassificationSidebar({ availableClassifications, activeFilters, setActiveFilters, onClose }) {
  
  const toggleFilter = (category, value) => {
    setActiveFilters(prev => {
      const currentList = prev[category] || [];
      if (currentList.includes(value)) {
        return { ...prev, [category]: currentList.filter(v => v !== value) };
      } else {
        return { ...prev, [category]: [...currentList, value] };
      }
    });
  };

  const clearAll = () => {
    setActiveFilters({ genres: [], subGenres: [], species: [], commonNames: [] });
  };

  const renderSection = (title, categoryKey, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{title}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map(item => {
             const checked = (activeFilters[categoryKey] || []).includes(item);
             return (
               <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={() => toggleFilter(categoryKey, item)}
                  />
                  <span>{item}</span>
               </label>
             );
          })}
        </div>
      </div>
    );
  };

  const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0);

  return (
    <div style={{ width: '280px', height: '100%', backgroundColor: 'var(--panel-bg)', borderRight: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
           <Target size={18} color="#8957e5" /> Classification Filters
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
        
        {hasActiveFilters && (
          <button className="btn btn-outline" style={{ width: '100%', marginBottom: '20px', padding: '6px' }} onClick={clearAll}>
             Clear All Filters
          </button>
        )}

        {renderSection("Genres", "genres", availableClassifications.genres)}
        {renderSection("Sub-Genres", "subGenres", availableClassifications.subGenres)}
        {renderSection("Species", "species", availableClassifications.species)}
        {renderSection("Common Names", "commonNames", availableClassifications.commonNames)}

        {!availableClassifications.genres?.length && !availableClassifications.subGenres?.length && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '0.9rem', lineHeight: '1.5' }}>
             No fully classified photos found.<br/>Review your pending AI tags on the <strong>Map</strong> tab!
          </div>
        )}
      </div>

    </div>
  );
}
