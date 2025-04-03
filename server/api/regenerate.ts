import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import axios from "axios";
import { createError } from "h3";

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
  metadata?: {
    sources?: ChunkMetadata[];
    youtubeVideos?: YouTubeVideo[];
  };
}

interface RegenerateRequest {
  pathway: Pathway;
  itemType: "step" | "activity";
  itemIndex: number;
  activityIndex?: number;
  regenerationPrompt: string;
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
  try {
    const body = await readBody<RegenerateRequest>(event);
    const { pathway, itemType, itemIndex, activityIndex, regenerationPrompt } =
      body;

    if (!pathway || !itemType || regenerationPrompt === undefined) {
      return createError({
        statusCode: 400,
        statusMessage: "Missing required parameters",
      });
    }

    // Get embedding for the query to find relevant context
    const queryText = `${pathway.name} ${pathway.description} ${regenerationPrompt}`;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
      encoding_format: "float",
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone for similar vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 15,
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

    // Query YouTube for relevant videos if needed
    const youtubeResults = await queryYouTube(queryText);

    let systemPrompt = "";
    let functions;

    if (itemType === "step") {
      // Regenerate a step
      systemPrompt = `
        Your role is to regenerate a step in a learning pathway based on user feedback.
        
        Current Pathway: ${pathway.name}
        Pathway Description: ${pathway.description}
        User's regeneration request: ${regenerationPrompt}
        
        INSTRUCTIONS:
        1. Create a new step to replace the existing one based on the user's request.
        2. The step should have a name, description, and activities that fit within the overall pathway structure.
        3. Each activity must have a name and description.
        4. For reading activities, include relevant text in the "readData" field.
        5. If an activity should link to a PDF document, include URLs in the "pdfUrls" array.
        6. For video activities, include relevant YouTube URLs in the "videoUrls" array.
        7. For quiz activities, create appropriate questions in the "quiz" array.
           - Each question should have a "type" field with either "subjective" (open-ended) or "objective" (multiple choice).
           - For objective questions, include "options" array with possible answers and "correctOptions" array with the correct answers.
           - Assign appropriate "points" value for each question.
        
        CURRENT STEP TO REPLACE:
        ${JSON.stringify(pathway.steps[itemIndex], null, 2)}
        
        CONTEXT:
        Use the following context to create the new step:
        ${relevantChunks
          .map(
            (chunk) =>
              `${chunk.text} (Document: ${chunk.metadata.document}, Page: ${chunk.metadata.page})`
          )
          .join("\n")}

        YOUTUBE VIDEOS:
        ${youtubeResults
          .map(
            (video) =>
              `${video.title}: ${video.url}\nDescription: ${video.description}`
          )
          .join("\n")}
      `;

      functions = [
        {
          name: "generateStep",
          description: "Generates a new step for the learning pathway.",
          parameters: {
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
                      description: "Instructions or details for the activity.",
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
                      description: "URLs to PDF resources for this activity.",
                    },
                    videoUrls: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description: "URLs to video resources for this activity.",
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
      ];
    } else if (itemType === "activity") {
      // Regenerate a single activity
      if (
        activityIndex === undefined ||
        activityIndex < 0 ||
        activityIndex >= pathway.steps[itemIndex].activities.length
      ) {
        console.error(
          `Invalid activity index: ${activityIndex} for step ${itemIndex}`
        );
        console.log(
          `Step has ${
            pathway.steps[itemIndex]?.activities?.length || 0
          } activities`
        );

        return createError({
          statusCode: 400,
          statusMessage: "Invalid activity index",
        });
      }

      console.log(
        `Regenerating activity at index ${activityIndex} in step ${itemIndex}`
      );
      console.log(
        `Current activity:`,
        JSON.stringify(
          pathway.steps[itemIndex].activities[activityIndex]
        ).substring(0, 200) + "..."
      );

      systemPrompt = `
        Your role is to regenerate an activity in a learning pathway step based on user feedback.
        
        Current Pathway: ${pathway.name}
        Pathway Description: ${pathway.description}
        Current Step: ${pathway.steps[itemIndex].name}
        Step Description: ${pathway.steps[itemIndex].description}
        User's regeneration request: ${regenerationPrompt}
        
        INSTRUCTIONS:
        1. Create a new activity to replace the existing one based on the user's request.
        2. The activity must have a name and description.
        3. For reading activities, include relevant text in the "readData" field.
        4. If the activity should link to a PDF document, include URLs in the "pdfUrls" array.
        5. For video activities, include relevant YouTube URLs in the "videoUrls" array.
        6. For quiz activities, create appropriate questions in the "quiz" array.
           - Each question should have a "type" field with either "subjective" (open-ended) or "objective" (multiple choice).
           - For objective questions, include "options" array with possible answers and "correctOptions" array with the correct answers.
           - Assign appropriate "points" value for each question.
        
        CURRENT ACTIVITY TO REPLACE:
        ${JSON.stringify(
          pathway.steps[itemIndex].activities[activityIndex],
          null,
          2
        )}
        
        CONTEXT:
        Use the following context to create the new activity:
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
          
        IMPORTANT: For any video-based activities, you MUST ONLY use the exact YouTube URLs provided above. DO NOT create or invent URLs.
      `;

      functions = [
        {
          name: "generateActivity",
          description:
            "Generates a new activity for a step in the learning pathway.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "A concise title for the activity.",
              },
              description: {
                type: "string",
                description: "Instructions or details for the activity.",
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
                description: "URLs to PDF resources for this activity.",
              },
              videoUrls: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "URLs to video resources for this activity.",
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
      ];
    } else {
      return createError({
        statusCode: 400,
        statusMessage: "Invalid item type",
      });
    }

    // Make the OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      functions,
      function_call: {
        name: itemType === "step" ? "generateStep" : "generateActivity",
      },
      temperature: 0.7,
    });

    // Parse the function call response
    const functionResponse = JSON.parse(
      completion.choices[0].message.function_call?.arguments || "{}"
    );

    console.log(
      "Function response:",
      JSON.stringify(functionResponse).substring(0, 200) + "..."
    );

    // Validate the response
    if (!functionResponse || typeof functionResponse !== "object") {
      console.error("Invalid function response:", functionResponse);
      return createError({
        statusCode: 500,
        statusMessage: "Invalid response from AI model",
      });
    }

    if (
      itemType === "step" &&
      (!functionResponse.name ||
        !functionResponse.description ||
        !Array.isArray(functionResponse.activities))
    ) {
      console.error("Invalid step structure in response:", functionResponse);
      return createError({
        statusCode: 500,
        statusMessage: "Invalid step structure in AI response",
      });
    }

    if (
      itemType === "activity" &&
      (!functionResponse.name || !functionResponse.description)
    ) {
      console.error(
        "Invalid activity structure in response:",
        functionResponse
      );
      return createError({
        statusCode: 500,
        statusMessage: "Invalid activity structure in AI response",
      });
    }

    // Process YouTube URLs in the regenerated content
    if (itemType === "step") {
      processStepYouTubeURLs(functionResponse as Step, youtubeResults);
    } else {
      // It's an activity
      processActivityYouTubeURLs(functionResponse as Activity, youtubeResults);
    }

    // Clone the pathway to avoid mutating the original
    const updatedPathway = JSON.parse(JSON.stringify(pathway)) as Pathway;

    // Update the pathway with the regenerated content
    if (itemType === "step") {
      updatedPathway.steps[itemIndex] = functionResponse as Step;
    } else {
      // It's an activity
      updatedPathway.steps[itemIndex].activities[activityIndex!] =
        functionResponse as Activity;
    }

    const response = {
      success: true,
      updatedPathway,
      regeneratedItem: functionResponse,
    };

    console.log(
      "Regeneration response:",
      JSON.stringify(response).substring(0, 200) + "..."
    );

    return response;
  } catch (error) {
    console.error("Error regenerating content:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Failed to regenerate content",
    });
  }
});

// Helper function to process and fix YouTube URLs in a step
function processStepYouTubeURLs(step: Step, youtubeVideos: YouTubeVideo[]) {
  // Create a map of valid YouTube URLs for quick lookup
  const validYouTubeUrls = new Map<string, YouTubeVideo>();
  youtubeVideos.forEach((video) => {
    validYouTubeUrls.set(video.url, video);
  });

  // Process each activity in the step
  step.activities.forEach((activity) => {
    processActivityYouTubeURLs(activity, youtubeVideos);
  });
}

// Helper function to process and fix YouTube URLs in an activity
function processActivityYouTubeURLs(
  activity: Activity,
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

  // Skip if no videoUrls
  if (!activity.videoUrls || activity.videoUrls.length === 0) {
    return;
  }

  // Filter out invalid URLs
  const validUrls = activity.videoUrls.filter((url) => isValidYouTubeUrl(url));

  // If no valid URLs found but we had some URLs, replace with our first valid YouTube URL
  if (validUrls.length === 0 && youtubeVideos.length > 0) {
    activity.videoUrls = [youtubeVideos[0].url];
    // Also add the youtubeVideos metadata
    activity.youtubeVideos = [youtubeVideos[0]];
  } else {
    // Use only valid URLs
    activity.videoUrls = validUrls;
    // Add metadata for each valid URL
    activity.youtubeVideos = validUrls.map((url) => validYouTubeUrls.get(url)!);
  }
}
