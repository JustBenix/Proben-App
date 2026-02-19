
declare const pdfjsLib: any;

if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Sort items by vertical position (Y) descending, then horizontal (X) ascending
          const items = textContent.items.sort((a: any, b: any) => {
            if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
              return a.transform[4] - b.transform[4];
            }
            return b.transform[5] - a.transform[5];
          });

          let lastY = -1;
          let pageText = '';
          
          for (const item of items) {
            const currentY = item.transform[5];
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
            } else if (lastY !== -1) {
              pageText += ' ';
            }
            pageText += item.str;
            lastY = currentY;
          }
          
          fullText += pageText + '\n\n--PAGE--\n\n';
        }
        
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const splitTextIntoBlocks = (text: string, documentId: string): any[] => {
  // We use this as a fallback if AI cleanup is skipped, 
  // but it's now smarter by looking for typical script patterns
  const patterns = [
    /\n(?=[A-Z]{2,}\s?:)/, // Matches "NAME:"
    /\n(?=[A-Z]{2,}\n)/,    // Matches "NAME" followed by newline
    /\n\n/                 // Generic block separator
  ];
  
  // Combine patterns for split
  const rawBlocks = text.split(new RegExp(patterns.map(p => p.source).join('|')))
    .map(b => b.trim())
    .filter(b => b.length > 5);

  return rawBlocks.map((line, index) => ({
    id: `b-${documentId}-${index}`,
    documentId,
    text: line,
    orderIndex: index
  }));
};
