export type ReflectionWho = "Jud" | "Jules" | "Max";

export interface Reflection {
  who: ReflectionWho;
  text: string;
  threads: string[];
  savedAt: string;
}

export interface SaveReflectionRequest {
  who: ReflectionWho;
  text: string;
  threads: string[];
}

export interface SaveReflectionResponse {
  ok: true;
  fileId: string;
  fileName: string;
  appendedAt: string;
}

export interface RecentReflectionsRequest {
  n: number;
}

export interface RecentReflectionsResponse {
  count: number;
  reflections: Reflection[];
}

export interface CleanupReflectionsResponse {
  ok: true;
  removedCount: number;
  cleanedAt: string;
}
