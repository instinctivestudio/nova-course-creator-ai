import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

// Helper function to query YouTube
async function queryYouTube(query) {
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
    return response.data.items.map((item) => ({
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
  const query = getQuery(event);

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
    const relevantChunks = queryResponse.matches.map((match) => ({
      text: match.metadata.content,
      metadata: {
        document: match.metadata.pdf_name,
        page: match.metadata.page_number,
      },
    }));

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
      5. For video activities, include relevant YouTube URLs in the "videoUrls" array.
      6. For quiz activities, create appropriate questions in the "quiz" array. 
         - Each question should have a "type" field with either "subjective" (open-ended) or "objective" (multiple choice).
         - For objective questions, include "options" array with possible answers and "correctOptions" array with the correct answers.
         - Assign appropriate "points" value for each question.
      7. Don't include step numbers in names like "Step 1", "Step 2", etc. Just use descriptive titles.
      8. Include sources where relevant, and format document names to be reader-friendly.
      9. Each pathway should have 5-7 steps, with 3-4 activities per step.

      CONTEXT:
      Use the following context to generate the pathway steps and activities:
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
      completion.choices[0].message.function_call.arguments
    );

    // Return the final JSON with the new structure
    return {
      name: pathway_name,
      description: pathway_overview,
      steps: functionResponse.steps,
      metadata: {
        sources: relevantChunks.map((chunk) => chunk.metadata),
        youtubeVideos: youtubeResults,
      },
    };
  } catch (error) {
    console.error("Error generating pathway:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Failed to generate pathway",
    });
  }
});
