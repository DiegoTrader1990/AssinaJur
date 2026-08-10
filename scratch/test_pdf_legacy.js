async function testRenderDocument() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('PDF.js legacy loaded:', typeof pdfjs.getDocument);
  } catch (err) {
    console.error('Error:', err);
  }
}
testRenderDocument();
