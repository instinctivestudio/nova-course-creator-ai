import { useFetch } from "#app";

export interface PathwayDetails {
  title: string;
  description: string;
  learningOutcomes: string;
  targetAudience: string;
  whyTakeIt: string;
}

export const generatePathwayDetails = async (
  prompt: string
): Promise<PathwayDetails> => {
  try {
    const { data, error } = await useFetch<PathwayDetails>(
      "/api/pathway-details",
      {
        method: "POST",
        body: { prompt },
      }
    );

    if (error.value) {
      throw new Error(error.value.message);
    }

    return data.value as PathwayDetails;
  } catch (err) {
    console.error("Error generating pathway details:", err);
    throw err;
  }
};
