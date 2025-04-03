import { defineStore } from "pinia";

interface SourceItem {
  document: string;
  page: number;
}

interface VideoItem {
  title: string;
  url: string;
  description: string;
}

interface Metadata {
  sources?: SourceItem[];
  youtubeVideos?: VideoItem[];
}

interface QuizQuestion {
  question: string;
  type: "subjective" | "objective";
  options?: string[];
  correctOptions?: string[];
  points?: number;
  _id?: string;
}

interface Activity {
  name: string;
  description: string;
  readData?: string;
  pdfUrls?: string[];
  videoUrls?: string[];
  quiz?: QuizQuestion[];
}

interface Step {
  name: string;
  description: string;
  activities: Activity[];
  isExpanded?: boolean;
}

interface Pathway {
  name: string;
  description: string;
  steps: Step[];
  metadata?: Metadata;
}

export const usePathwayStore = defineStore("pathway", {
  state: () => ({
    title: "",
    description: "",
    learningOutcomes: "",
    targetAudience: "",
    whyTakeIt: "",
    pathway: {
      name: "",
      description: "",
      steps: [],
    } as Pathway,
  }),
  actions: {
    setPathway(pathway: Pathway) {
      this.pathway = pathway;
    },
    setTitle(title: string) {
      this.title = title;
    },
    setDescription(description: string) {
      this.description = description;
    },
    setLearningOutcomes(outcomes: string) {
      this.learningOutcomes = outcomes;
    },
    setTargetAudience(audience: string) {
      this.targetAudience = audience;
    },
    setWhyTakeIt(reason: string) {
      this.whyTakeIt = reason;
    },
  },
});
