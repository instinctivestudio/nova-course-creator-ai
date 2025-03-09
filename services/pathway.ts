// Import types from the types directory
import type { Pathway, Step, Activity } from "~/types/pathway";
import type { RegenerationResponse } from "~/types/api";
import { useCourseStore } from "~/stores/courseStore";

// Define service-specific types that aren't in the types directory
interface PathwayQueryParams {
  pathway_name: string;
  pathway_overview: string;
  pathway_learning_outcomes: string;
  audience: string;
  rationale: string;
}

interface RegenerateParams {
  pathway: Pathway;
  itemType: "step" | "activity";
  itemIndex: number;
  activityIndex?: number;
  regenerationPrompt: string;
}

interface RegenerateResponse {
  updatedPathway: Pathway;
  regeneratedItem: Step | Activity;
}

export const generatePathway = async (
  params: PathwayQueryParams
): Promise<Pathway> => {
  try {
    console.log("Calling API with params:", params);

    const { data, error } = await useFetch("/api/pathway", {
      params,
    });

    if (error.value) {
      console.error("API error:", error.value);
      throw new Error(error.value.message || "Failed to generate pathway");
    }

    console.log("Raw API response:", data.value);

    // Ensure the response matches the Pathway type
    const pathway = data.value as any;

    // Return a properly structured Pathway object
    return {
      name: pathway.name || pathway.pathway_name || params.pathway_name,
      description:
        pathway.description ||
        pathway.pathway_overview ||
        params.pathway_overview,
      steps: pathway.steps || [],
      metadata: pathway.metadata || {
        sources: [],
        youtubeVideos: [],
      },
    };
  } catch (err) {
    console.error("Error generating pathway:", err);
    throw err;
  }
};

export const regenerateContent = async (
  params: RegenerateParams
): Promise<RegenerationResponse> => {
  try {
    console.log("Calling regenerate API with params:", params);

    const { data, error } = await useFetch("/api/regenerate", {
      method: "POST",
      body: params,
    });

    if (error.value) {
      console.error("Regenerate API error:", error.value);
      throw new Error(error.value.message || "Failed to regenerate content");
    }

    console.log("Raw regenerate API response:", data.value);

    // The API returns { success, updatedPathway, regeneratedItem }
    // But the UI expects { success, regeneratedItem }
    const apiResponse = data.value as any;

    // Update the store with the updated pathway if present
    if (apiResponse.updatedPathway) {
      const store = useCourseStore();
      store.setPathway(apiResponse.updatedPathway);
    }

    // Return the structure that the UI expects
    return {
      success: apiResponse.success === true,
      regeneratedItem: apiResponse.regeneratedItem,
    } as RegenerationResponse;
  } catch (err) {
    console.error("Error regenerating content:", err);
    throw err;
  }
};
