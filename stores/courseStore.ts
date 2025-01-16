import { defineStore } from "pinia";

// Define interfaces for the pathway structure
interface Activity {
  id: string;
  activityType: string;
  title: string;
  description: string;
}

interface Step {
  id: string;
  stepName: string;
  activities: Activity[];
  isExpanded?: boolean;
}

interface Pathway {
  pathway_name: string;
  steps: Step[];
}

export const useCourseStore = defineStore("course", {
  state: () => ({
    title: "",
    description: "",
    learningOutcomes: "",
    targetAudience: "",
    whyTakeIt: "",
    pathway: {
      pathway_name: "",
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
