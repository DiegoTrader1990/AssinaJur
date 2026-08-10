const { createCanvas } = require('@napi-rs/canvas');

async function renderPdfPageToBuffer() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Create a minimal PDF using pdf-lib to test end to end
    const { PDFDocument, rgb } = require('pdf-lib');
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    page.drawText('CONTRATO DE PRESTACAO DE SERVICOS ADVOCATICIOS', { x: 50, y: 750, size: 16 });
    page.drawText('CLIENTE: DOMINICK QUINTO SOARES', { x: 50, y: 700, size: 14 });
    page.drawText('Assinatura do Cliente: _______________________', { x: 50, y: 200, size: 14 });
    const pdfBytes = await doc.save();
    
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBytes),
      verbosity: 0,
      disableFontFace: false,
    });
    
    const pdfDoc = await loadingTask.promise;
    console.log('Total pages:', pdfDoc.numPages);
    
    const pdfPage = await pdfDoc.getPage(1);
    const viewport = pdfPage.getViewport({ scale: 1.5 });
    
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext('2d');
    
    await pdfPage.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    const pngBuffer = canvas.toBuffer('image/png');
    console.log('PNG rendered successfully! Buffer size:', pngBuffer.length, 'bytes');
    return pngBuffer;
  } catch (err) {
    console.error('Error rendering PDF page to PNG:', err);
  }
}

renderPdfPageToBuffer();
