// Server-side PDF parsing using pdf-parse
// This module is only used in API routes (Node.js runtime)

import pdfParse from 'pdf-parse';

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    // Clean up extracted text
    let text = data.text || '';
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    // Re-add paragraph breaks where there were double newlines
    text = text.replace(/\. /g, '.\n');
    return text;
  } catch {
    throw new Error('Failed to parse PDF. Please paste your resume as text instead.');
  }
}
