export interface AnalyzeOptions {
  cwd?: string;
}

export interface AnalyzeResult {
  reason: string;
  rule: string;
  segment: string;
}
