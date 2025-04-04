import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import axios from "axios";
import { H3Event, getRequestHeader, createError } from "h3";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const index = process.env.PINECONE_INDEX_NAME
  ? pinecone.index(process.env.PINECONE_INDEX_NAME)
  : pinecone.index("default-index"); // Fallback index name

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

// Helper function to check authentication
const checkAuth = (event: H3Event) => {
  const authHeader = getRequestHeader(event, "Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Missing or invalid authentication token",
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  if (!token || !token.startsWith("valid_token_")) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Invalid authentication token",
    });
  }

  return true;
};

// Define types
interface YouTubeVideo {
  title: string;
  url: string;
  description: string;
}

interface ChunkMetadata {
  document: string;
  page: string | number;
}

interface RelevantChunk {
  text: string;
  metadata: ChunkMetadata;
}

interface QuizQuestion {
  question: string;
  type: "subjective" | "objective";
  options?: string[];
  correctOptions?: string[];
  points: number;
}

interface Activity {
  name: string;
  description: string;
  readData?: string;
  pdfUrls?: string[];
  videoUrls?: string[];
  quiz?: QuizQuestion[];
  youtubeVideos?: YouTubeVideo[];
}

interface Step {
  name: string;
  description: string;
  activities: Activity[];
}

interface Pathway {
  name: string;
  description: string;
  steps: Step[];
}

interface PathwayResponse extends Pathway {
  metadata: {
    sources: ChunkMetadata[];
    youtubeVideos: YouTubeVideo[];
  };
}

interface PathwayQueryParams {
  pathway_name: string;
  pathway_overview: string;
  pathway_learning_outcomes: string;
  audience: string;
  rationale: string;
}

// Helper function to query YouTube
async function queryYouTube(query: string): Promise<YouTubeVideo[]> {
  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 5, // Limit to top 5 videos
        key: YOUTUBE_API_KEY,
      },
    });

    // Map relevant fields
    return response.data.items.map((item: any) => ({
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      description: item.snippet.description,
    }));
  } catch (error) {
    console.error("Error querying YouTube:", error);
    return [];
  }
}

export default defineEventHandler(async (event) => {
  // Verify authentication before proceeding
  checkAuth(event);

  const query = getQuery(event) as PathwayQueryParams;

  const {
    pathway_name,
    pathway_overview,
    pathway_learning_outcomes,
    audience,
    rationale,
  } = query;

  // Validate required parameters
  if (
    !pathway_name ||
    !pathway_overview ||
    !pathway_learning_outcomes ||
    !audience ||
    !rationale
  ) {
    return createError({
      statusCode: 400,
      statusMessage: "Missing required parameters",
    });
  }

  try {
    // Get embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${pathway_name} ${pathway_overview}`,
      encoding_format: "float",
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone for similar vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
    });

    // Extract chunks from Pinecone results
    const relevantChunks: RelevantChunk[] = queryResponse.matches.map(
      (match: any) => ({
        text: match.metadata.content,
        metadata: {
          document: match.metadata.pdf_name,
          page: match.metadata.page_number,
        },
      })
    );

    // Query YouTube for relevant videos
    const youtubeResults = await queryYouTube(
      `${pathway_name} ${pathway_overview}`
    );

    // Build the system prompt and instruct the model to include videoUrl for "Watch" activities
    const systemPrompt = `
      Your role is to flesh out a learning pathway. I'm going to give you details for a pathway, and I need you to provide a series of steps and activities that the user can take to achieve the learning goals.

      Pathway name: ${pathway_name}
      Pathway overview: ${pathway_overview}
      Pathway learning outcomes: ${pathway_learning_outcomes}
      Pathway Audience: ${audience}
      Pathway Rationale: ${rationale}

      IMPORTANT RULES:
      1. Structure the pathway as follows: A Pathway contains Steps, and each Step contains Activities.
      2. Each Activity must have a name and description.
      3. For reading activities, include relevant text in the "readData" field.
      4. If an Activity should link to a PDF document, include URLs in the "pdfUrls" array.
      5. For video activities, ONLY USE THE EXACT YouTube URLs listed below in the "videoUrls" array. DO NOT generate your own YouTube URLs or placeholders.
      6. For quiz activities, create appropriate questions in the "quiz" array. 
         - Each question should have a "type" field with either "subjective" (open-ended) or "objective" (multiple choice).
         - For objective questions, include "options" array with possible answers and "correctOptions" array with the correct answers.
         - Assign appropriate "points" value for each question.
      7. Don't include step numbers in names like "Step 1", "Step 2", etc. Just use descriptive titles.
      8. Include sources where relevant, and format document names to be reader-friendly.
      9. Each pathway should have 5-7 steps, with 3-4 activities per step.
      10. IMPORTANT: For any video-based activities, you MUST ONLY use the exact YouTube URLs provided below. DO NOT create your own URLs.

      CONTEXT:
      Use the following context to generate the pathway steps and activities:
      ${relevantChunks
        .map(
          (chunk) =>
            `${chunk.text} (Document: ${chunk.metadata.document}, Page: ${chunk.metadata.page})`
        )
        .join("\n")}

      YOUTUBE VIDEOS - USE ONLY THESE EXACT URLS FOR VIDEO ACTIVITIES:
      ${youtubeResults
        .map(
          (video) =>
            `Title: ${video.title}\nURL: ${video.url}\nDescription: ${video.description}`
        )
        .join("\n\n")}
        
      YOU MUST ONLY USE THESE EXACT YOUTUBE URLS IN YOUR GENERATED CONTENT. DO NOT CREATE YOUR OWN URLs.
    `;

    // Define the function for OpenAI to match base_pathway_schema.ts
    const functions = [
      {
        name: "generateLearningPathway",
        description:
          "Generates a learning pathway with steps and activities according to the schema.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name or title of the pathway.",
            },
            description: {
              type: "string",
              description: "A comprehensive description of the pathway.",
            },
            steps: {
              type: "array",
              description: "List of steps in the learning pathway.",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The name or title of the step.",
                  },
                  description: {
                    type: "string",
                    description: "A detailed description of the step.",
                  },
                  activities: {
                    type: "array",
                    description: "A list of activities under this step.",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "A concise title for the activity.",
                        },
                        description: {
                          type: "string",
                          description:
                            "Instructions or details for the activity.",
                        },
                        readData: {
                          type: "string",
                          description: "Text content for reading activities.",
                        },
                        pdfUrls: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                          description:
                            "URLs to PDF resources for this activity.",
                        },
                        videoUrls: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                          description:
                            "URLs to video resources for this activity.",
                        },
                        quiz: {
                          type: "array",
                          description: "Quiz questions for this activity.",
                          items: {
                            type: "object",
                            properties: {
                              question: {
                                type: "string",
                                description: "The quiz question text.",
                              },
                              type: {
                                type: "string",
                                enum: ["subjective", "objective"],
                                description:
                                  "Type of question: subjective (open-ended) or objective (multiple choice).",
                              },
                              options: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                description:
                                  "Answer options for multiple choice questions.",
                              },
                              correctOptions: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                description:
                                  "Correct answer options for multiple choice questions.",
                              },
                              points: {
                                type: "number",
                                description:
                                  "Points awarded for correctly answering this question.",
                              },
                            },
                            required: ["question", "type"],
                          },
                        },
                      },
                      required: ["name", "description"],
                    },
                  },
                },
                required: ["name", "description", "activities"],
              },
            },
          },
          required: ["name", "description", "steps"],
        },
      },
    ];

    // Make the OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      max_completion_tokens: 5000,
      functions,
      function_call: { name: "generateLearningPathway" },
      temperature: 0.8,
    });

    // Parse the function call response
    const functionResponse = JSON.parse(
      completion.choices[0].message.function_call?.arguments || "{}"
    ) as Pathway;

    // Process the pathway to ensure YouTube URLs are valid
    processPathwayYouTubeURLs(functionResponse, youtubeResults);

    // Return the final JSON with the new structure
    const result = {
      name: pathway_name,
      description: pathway_overview,
      steps: functionResponse.steps,
      metadata: {
        sources: relevantChunks.map((chunk) => chunk.metadata),
        youtubeVideos: youtubeResults,
      },
    } as PathwayResponse;

    console.log(
      "Returning pathway from API:",
      JSON.stringify(result).substring(0, 200) + "..."
    );

    return result;
  } catch (error) {
    console.error("Error generating pathway:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Failed to generate pathway",
    });
  }
});

// Helper function to process and fix YouTube URLs
function processPathwayYouTubeURLs(
  pathway: Pathway,
  youtubeVideos: YouTubeVideo[]
) {
  // Create a map of valid YouTube URLs for quick lookup
  const validYouTubeUrls = new Map<string, YouTubeVideo>();
  youtubeVideos.forEach((video) => {
    validYouTubeUrls.set(video.url, video);
  });

  // Helper to check if a URL is a valid YouTube URL from our results
  const isValidYouTubeUrl = (url: string): boolean => {
    return validYouTubeUrls.has(url);
  };

  // Process each step and activity
  pathway.steps.forEach((step) => {
    step.activities.forEach((activity) => {
      // Skip if no videoUrls
      if (!activity.videoUrls || activity.videoUrls.length === 0) {
        return;
      }

      // Filter out invalid URLs
      const validUrls = activity.videoUrls.filter((url) =>
        isValidYouTubeUrl(url)
      );

      // If no valid URLs found but we had some URLs, replace with our first valid YouTube URL
      if (validUrls.length === 0 && youtubeVideos.length > 0) {
        activity.videoUrls = [youtubeVideos[0].url];
        // Also add the youtubeVideos metadata
        activity.youtubeVideos = [youtubeVideos[0]];
      } else {
        // Use only valid URLs
        activity.videoUrls = validUrls;
        // Add metadata for each valid URL
        activity.youtubeVideos = validUrls.map(
          (url) => validYouTubeUrls.get(url)!
        );
      }
    });
  });
}
