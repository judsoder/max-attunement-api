/**
 * Service for fetching course materials (pages, modules, linked docs)
 */
import { config } from "../config.js";
import { stripHtml } from "../utils/html.js";
import { fetchAllGoogleContent, extractGoogleUrls } from "../utils/google-docs.js";
import type { StudentConfig } from "../types/student.js";
import type { CanvasPage, CanvasModule, CanvasModuleItem } from "../types/canvas.js";

interface MaterialItem {
  id: number | string;
  type: "page" | "module_item" | "external_link";
  title: string;
  url?: string;
  content?: string;
  contentPreview?: string;
  googleDocs?: Array<{
    url: string;
    type: "doc" | "spreadsheet" | "pdf" | "unknown";
    content?: string;
    error?: string;
  }>;
}

interface CourseMaterials {
  courseId: number;
  courseName?: string;
  pages: MaterialItem[];
  moduleItems: MaterialItem[];
  externalLinks: MaterialItem[];
}

async function canvasFetch<T>(path: string, studentConfig: StudentConfig): Promise<T> {
  const url = `${config.canvasBaseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${studentConfig.canvasToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get all pages for a course
 */
export async function getCoursePages(
  courseId: number,
  studentConfig: StudentConfig
): Promise<CanvasPage[]> {
  return canvasFetch<CanvasPage[]>(
    `/api/v1/courses/${courseId}/pages?per_page=100`,
    studentConfig
  );
}

/**
 * Get a single page with full content
 */
export async function getPageContent(
  courseId: number,
  pageUrl: string,
  studentConfig: StudentConfig
): Promise<CanvasPage> {
  return canvasFetch<CanvasPage>(
    `/api/v1/courses/${courseId}/pages/${pageUrl}`,
    studentConfig
  );
}

/**
 * Get all modules with items for a course
 */
export async function getCourseModules(
  courseId: number,
  studentConfig: StudentConfig
): Promise<CanvasModule[]> {
  return canvasFetch<CanvasModule[]>(
    `/api/v1/courses/${courseId}/modules?include[]=items&per_page=100`,
    studentConfig
  );
}

/**
 * Search for pages matching a query (title contains)
 */
export async function searchPages(
  courseId: number,
  query: string,
  studentConfig: StudentConfig
): Promise<CanvasPage[]> {
  const pages = await getCoursePages(courseId, studentConfig);
  const lowerQuery = query.toLowerCase();
  return pages.filter(p => 
    p.title.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all materials for a course, optionally filtered by search term
 */
export async function getCourseMaterials(
  courseId: number,
  studentConfig: StudentConfig,
  options?: {
    search?: string;
    includeContent?: boolean;
    fetchGoogleDocs?: boolean;
  }
): Promise<CourseMaterials> {
  const { search, includeContent = false, fetchGoogleDocs = true } = options || {};
  const lowerSearch = search?.toLowerCase();

  // Fetch pages and modules in parallel
  const [pages, modules] = await Promise.all([
    getCoursePages(courseId, studentConfig),
    getCourseModules(courseId, studentConfig),
  ]);

  // Filter pages by search term if provided
  let filteredPages = pages;
  if (lowerSearch) {
    filteredPages = pages.filter(p => 
      p.title.toLowerCase().includes(lowerSearch)
    );
  }

  // Process pages
  const pageItems: MaterialItem[] = await Promise.all(
    filteredPages.slice(0, 20).map(async (page): Promise<MaterialItem> => {
      let content: string | undefined;
      let contentPreview: string | undefined;
      let googleDocs: MaterialItem["googleDocs"];

      if (includeContent || fetchGoogleDocs) {
        try {
          const fullPage = await getPageContent(courseId, page.url, studentConfig);
          if (fullPage.body) {
            content = includeContent ? stripHtml(fullPage.body, 10000) : undefined;
            contentPreview = stripHtml(fullPage.body, 200);
            
            if (fetchGoogleDocs) {
              const urls = extractGoogleUrls(fullPage.body);
              if (urls.length > 0) {
                googleDocs = await fetchAllGoogleContent(fullPage.body);
              }
            }
          }
        } catch {
          // Page content not accessible
        }
      }

      return {
        id: page.page_id,
        type: "page",
        title: page.title,
        url: page.html_url,
        content,
        contentPreview,
        googleDocs: googleDocs?.length ? googleDocs : undefined,
      };
    })
  );

  // Collect module items and external links
  const moduleItems: MaterialItem[] = [];
  const externalLinks: MaterialItem[] = [];

  for (const mod of modules) {
    if (!mod.items) continue;
    
    for (const item of mod.items) {
      // Skip if search provided and doesn't match
      if (lowerSearch && !item.title.toLowerCase().includes(lowerSearch)) {
        continue;
      }

      if (item.type === "ExternalUrl" && item.external_url) {
        // Check if it's a Google Doc
        const googleUrls = extractGoogleUrls(item.external_url);
        let googleDocs: MaterialItem["googleDocs"];
        
        if (googleUrls.length > 0 && fetchGoogleDocs) {
          googleDocs = await fetchAllGoogleContent(item.external_url);
        }

        externalLinks.push({
          id: item.id,
          type: "external_link",
          title: item.title,
          url: item.external_url,
          googleDocs: googleDocs?.length ? googleDocs : undefined,
        });
      } else if (item.type === "Page" && item.page_url) {
        // Already captured in pages
      } else if (item.type !== "SubHeader") {
        moduleItems.push({
          id: item.id,
          type: "module_item",
          title: `[${mod.name}] ${item.title}`,
          url: item.html_url,
        });
      }
    }
  }

  return {
    courseId,
    pages: pageItems,
    moduleItems,
    externalLinks,
  };
}

/**
 * Find study guide for a course (searches pages and external links)
 */
export async function findStudyGuide(
  courseId: number,
  studentConfig: StudentConfig,
  searchTerms: string[] = ["study guide", "review", "test prep"]
): Promise<MaterialItem[]> {
  const materials = await getCourseMaterials(courseId, studentConfig, {
    includeContent: true,
    fetchGoogleDocs: true,
  });

  const allItems = [...materials.pages, ...materials.externalLinks];
  
  return allItems.filter(item => {
    const titleLower = item.title.toLowerCase();
    return searchTerms.some(term => titleLower.includes(term.toLowerCase()));
  });
}
