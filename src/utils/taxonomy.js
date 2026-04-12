export const BIOLOGICAL_GENRES = ['Wildlife', 'Botany', 'Fungi'];

export const GENRE_OPTIONS = [
   ...BIOLOGICAL_GENRES,
   'Landscape', 'Architecture', 'Celestial/Astrophotography', 'Vehicle', 'Action/People', 'Abstract', 'Nature', 'Other'
];

export const SUBGENRE_MAP = {
   'Wildlife': ['Birds', 'Mammals', 'Reptiles', 'Amphibians', 'Insects', 'Fish', 'Marine Life'],
   'Botany': ['Flowers', 'Trees', 'Foliage', 'Succulents', 'Grasses'],
   'Fungi': ['Mushrooms', 'Lichens', 'Slime Molds'],
   'Landscape': ['Mountains', 'Waterfalls', 'Oceans', 'Deserts', 'Forests', 'Urban'],
   'Architecture': ['Cityscape', 'Historical', 'Industrial', 'Bridges', 'Interiors'],
   'Celestial/Astrophotography': ['Night Sky', 'Moon', 'Stars', 'Aurora', 'Deep Space'],
   'Vehicle': ['Automobiles', 'Aircraft', 'Watercraft', 'Trains'],
   'Action/People': ['Portraits', 'Sports', 'Street', 'Events'],
   'Abstract': ['Macro', 'Textures', 'Patterns', 'Light/Shadow'],
   'Nature': ['Flowers', 'Plants', 'Trees', 'Sunrise/Sunset', 'Other'],
   'Other': ['Other']
};
