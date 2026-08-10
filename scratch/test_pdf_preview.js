const fs = require('fs');
const path = require('path');

async function testPdfRender() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('PDF.js legacy loaded successfully. Version:', pdfjs.version);
  } catch (err) {
    console.error('Error loading pdfjs legacy:', err);
  }
}

testPdfRender();
