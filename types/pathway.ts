export interface QuizQuestion {
  question: string;
  type: "subjective" | "objective";
  options?: string[];
  correctOptions?: string[];
  points?: number;
  _id?: string;
}

export interface Activity {
  name: string;
  description: string;
  readData?: string;
  pdfUrls?: string[];
  videoUrls?: string[];
  quiz?: QuizQuestion[];
}

export interface Step {
  name: string;
  description: string;
  activities: Activity[];
  isExpanded?: boolean;
}

export interface SourceItem {
  document: string;
  page: number;
}

export interface VideoItem {
  title: string;
  url: string;
  description: string;
}

export interface Metadata {
  sources?: SourceItem[];
  youtubeVideos?: VideoItem[];
}

export interface Pathway {
  name: string;
  description: string;
  steps: Step[];
  metadata?: Metadata;
}
