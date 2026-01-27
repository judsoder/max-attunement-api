/**
 * Utility to fetch content from Google Docs and Drive files
 * Works with publicly shared docs (anyone with link can view)
 */

// pdf-parse for extracting text from PDFs
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Extract text from PDF using OCR (pdftoppm + Tesseract)
 */
async function ocrPdf(buffer: Buffer): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-ocr-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  
  try {
    // Write PDF to temp file
    fs.writeFileSync(pdfPath, buffer);
    
    // Convert PDF pages to PNG images using pdftoppm (poppler)
    execSync(`pdftoppm -png -r 200 "${pdfPath}" "${tmpDir}/page"`, {
      timeout: 60000,
    });
    
    // Get list of generated images
    const images = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith(".png"))
      .sort();
    
    const textParts: string[] = [];
    const maxPages = Math.min(images.length, 10);
    
    for (let i = 0; i < maxPages; i++) {
      const imagePath = path.join(tmpDir, images[i]);
      const imageBuffer = fs.readFileSync(imagePath);
      
      const result = await Tesseract.recognize(imageBuffer, "eng", {
        logger: () => {}, // Suppress progress logs
      });
      
      textParts.push(`-- Page ${i + 1} of ${images.length} --\n${result.data.text}`);
    }
    
    return textParts.join("\n\n");
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Check if extracted PDF text is meaningful (not just page markers or whitespace)
 */
function hasMeaningfulText(text: string): boolean {
  if (!text || text.length < 50) return false;
  
  // Remove page markers like "-- 1 of 4 --" and whitespace
  const cleaned = text
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
    .replace(/\s+/g, "")
    .trim();
  
  // Need at least 30 chars of actual content
  return cleaned.length > 30;
}

/**
 * Parse PDF - try text extraction first, fall back to OCR if empty
 */
async function parsePdf(buffer: Buffer): Promise<string> {
  // First try regular text extraction
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text?.trim() || "";
    
    // If we got meaningful text (not just page markers), return it
    if (hasMeaningfulText(text)) {
      return text;
    }
  } catch (err) {
    // Text extraction failed, will try OCR
    console.log("PDF text extraction failed, trying OCR...");
  }
  
  // Fall back to OCR
  console.log("PDF has no text content, using OCR...");
  return await ocrPdf(buffer);
}

interface GoogleDocContent {
  url: string;
  type: "doc" | "spreadsheet" | "pdf" | "unknown";
  title?: string;
  content?: string;
  error?: string;
}

/**
 * Extract Google Doc/Drive URLs from HTML content
 */
export function extractGoogleUrls(html: string): string[] {
  const urls: string[] = [];
  
  // Match Google Docs URLs
  const docPattern = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/g;
  // Match Google Drive file URLs
  const drivePattern = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g;
  // Match Google Sheets URLs
  const sheetPattern = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/g;
  
  let match;
  
  while ((match = docPattern.exec(html)) !== null) {
    urls.push(`https://docs.google.com/document/d/${match[1]}`);
  }
  
  while ((match = drivePattern.exec(html)) !== null) {
    urls.push(`https://drive.google.com/file/d/${match[1]}`);
  }
  
  while ((match = sheetPattern.exec(html)) !== null) {
    urls.push(`https://docs.google.com/spreadsheets/d/${match[1]}`);
  }
  
  // Dedupe
  return [...new Set(urls)];
}

/**
 * Determine the type of Google URL
 */
function getGoogleUrlType(url: string): "doc" | "spreadsheet" | "pdf" | "unknown" {
  if (url.includes("docs.google.com/document")) return "doc";
  if (url.includes("docs.google.com/spreadsheets")) return "spreadsheet";
  if (url.includes("drive.google.com/file")) return "pdf"; // Assume Drive files are PDFs
  return "unknown";
}

/**
 * Extract the file ID from a Google URL
 */
function extractFileId(url: string): string | null {
  // Google Docs: https://docs.google.com/document/d/FILE_ID/...
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return docMatch[1];
  
  // Google Sheets: https://docs.google.com/spreadsheets/d/FILE_ID/...
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return sheetMatch[1];
  
  // Google Drive: https://drive.google.com/file/d/FILE_ID/...
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return driveMatch[1];
  
  return null;
}

/**
 * Fetch content from a Google Doc (exports as plain text)
 */
async function fetchGoogleDoc(fileId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  
  const response = await fetch(exportUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AttunementBot/1.0)",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Doc: ${response.status}`);
  }
  
  const text = await response.text();
  return text.slice(0, 15000); // Limit size
}

/**
 * Fetch content from a Google Sheet (exports as CSV)
 */
async function fetchGoogleSheet(fileId: string): Promise<string> {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  
  const response = await fetch(exportUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AttunementBot/1.0)",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
  }
  
  const text = await response.text();
  return text.slice(0, 15000); // Limit size
}

/**
 * Fetch and parse a PDF from Google Drive
 */
async function fetchGoogleDrivePdf(fileId: string): Promise<string> {
  // Google Drive direct download URL
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  const response = await fetch(downloadUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AttunementBot/1.0)",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }
  
  // Get PDF as buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Parse PDF text
  const text = await parsePdf(buffer);
  
  // Return text content, limited to reasonable size
  return text.slice(0, 20000);
}

/**
 * Fetch content from a single Google URL
 */
export async function fetchGoogleContent(url: string): Promise<GoogleDocContent> {
  const type = getGoogleUrlType(url);
  const fileId = extractFileId(url);
  
  if (!fileId) {
    return {
      url,
      type: "unknown",
      error: "Could not extract file ID from URL",
    };
  }
  
  try {
    let content: string;
    
    switch (type) {
      case "doc":
        content = await fetchGoogleDoc(fileId);
        return { url, type, content };
        
      case "spreadsheet":
        content = await fetchGoogleSheet(fileId);
        return { url, type, content };
        
      case "pdf":
        content = await fetchGoogleDrivePdf(fileId);
        return { url, type, content };
        
      default:
        return {
          url,
          type: "unknown",
          error: "Unknown Google file type",
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      url,
      type,
      error: message,
    };
  }
}

/**
 * Fetch content from multiple Google URLs found in HTML
 */
export async function fetchAllGoogleContent(html: string): Promise<GoogleDocContent[]> {
  const urls = extractGoogleUrls(html);
  
  if (urls.length === 0) {
    return [];
  }
  
  // Fetch all in parallel
  const results = await Promise.all(urls.map(fetchGoogleContent));
  return results;
}
