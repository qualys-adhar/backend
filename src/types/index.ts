export interface WordFrequency {
  word: string;
  frequency: number;
}

export interface AnalysisResult {
  wordFrequencies: WordFrequency[];
  totalWords: number;
  uniqueWords: number;
}
