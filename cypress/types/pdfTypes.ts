export interface PDFPaths {
  base: string;
  compare: string;
}

export interface ComparisonResult {
  pass: boolean;
  textMatch: boolean;
  metaMatch: boolean;
  visualMatch: boolean;
  diffImagePaths?: string[] | null;
  textDiffPath?: string | null;
  metaDiffPath?: string | null;
  error?: string;
}

export interface PDFMetadata {
  [key: string]: any;
}
