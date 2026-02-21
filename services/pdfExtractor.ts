import * as pdfjsLib from 'pdfjs-dist';

// Point to the bundled PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

/**
 * Extracts the full text of a PDF (all pages concatenated) from a base64 string.
 * Returns an array of page texts so callers can paginate if needed.
 */
export async function extractPdfPages(pdfBase64: string): Promise<string[]> {
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
        pages.push(text);
    }

    return pages;
}

/**
 * Returns the full concatenated text of the PDF.
 */
export async function extractPdfText(pdfBase64: string): Promise<string> {
    const pages = await extractPdfPages(pdfBase64);
    return pages.join('\n\n');
}
