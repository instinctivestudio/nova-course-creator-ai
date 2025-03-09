import type { QuizQuestion } from "./pathway";

export interface RegenerationResponse {
  success: boolean;
  regeneratedItem: {
    name: string;
    description: string;
    activities?: Array<{
      name: string;
      description: string;
      readData?: string;
      pdfUrls?: string[];
      videoUrls?: string[];
      quiz?: QuizQuestion[];
    }>;
    readData?: string;
    pdfUrls?: string[];
    videoUrls?: string[];
    quiz?: QuizQuestion[];
  };
}
