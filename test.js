const { DOMParser } = require('xmldom');

const kmlTex = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Note 1</name>
      <description>First note description</description>
      <Point><coordinates>-80.2,40.1,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Note 2</name>
      <description>Second note description</description>
      <Point><coordinates>-80.3,40.2,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>`;

const parser = new DOMParser();
const xmlDoc = parser.parseFromString(kmlTex, 'text/xml');

const placemarks = Array.from(xmlDoc.getElementsByTagName('Placemark'));
const notes = [];

placemarks.forEach(pm => {
  const pmNameNode = pm.getElementsByTagName('name')[0];
  const pmDescNode = pm.getElementsByTagName('description')[0];
  const pointNode = pm.getElementsByTagName('coordinates')[0];
  
  const pmName = pmNameNode ? pmNameNode.textContent : '';
  let pmDesc = pmDescNode ? pmDescNode.textContent : '';
  
  if (pmName.startsWith('Note')) {
    notes.push({
      id: 'imported_note',
      text: pmDesc
    });
  }
});

console.log("Parsed Notes:", notes);
