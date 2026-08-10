const fs = require('fs');
const path = require('path');

async function testServerRender() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('PDF.js version:', pdfjs.version);
    
    // Test if canvas is available or if we can instantiate Canvas
    const { createCanvas } = require('@napi-rs/canvas');
    console.log('@napi-rs/canvas is available:', typeof createCanvas);
  } catch (err) {
    console.log('Error testing server render:', err.message);
  }
}

testServerRender();
