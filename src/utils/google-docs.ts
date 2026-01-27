/**
 * Utility to fetch content from Google Docs and Drive files
 * Works with publicly shared docs (anyone with link can view)
 */

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
        // PDFs in Google Drive can't be easily exported as text
        // Would need pdf-parse library or Google Drive API
        return {
          url,
          type,
          error: "PDF files cannot be parsed directly. Upload to chat for analysis.",
        };
        
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
