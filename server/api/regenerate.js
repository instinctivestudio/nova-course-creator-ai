import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import axios from "axios";
import { createError } from "h3";

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
  try {
    const body = await readBody(event);
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
    const relevantChunks = queryResponse.matches.map((match) => ({
      text: match.metadata.content,
      metadata: {
        document: match.metadata.pdf_name,
        page: match.metadata.page_number,
      },
    }));

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
        3. Maintain consistency with the other steps in the pathway.
        4. Include a variety of activity types as appropriate (reading materials, PDFs, videos, quizzes).
        
        CONTEXT:
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
          description: "Generates a replacement step for a learning pathway.",
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

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        functions,
        function_call: { name: "generateStep" },
        temperature: 0.7,
      });

      // Parse the function call response
      const generatedStep = JSON.parse(
        completion.choices[0].message.function_call.arguments
      );

      return {
        success: true,
        regeneratedItem: generatedStep,
      };
    } else if (itemType === "activity") {
      // Get the current step for context
      const step = pathway.steps[itemIndex];

      // Regenerate an activity
      systemPrompt = `
        Your role is to regenerate an activity in a learning pathway step based on user feedback.
        
        Current Pathway: ${pathway.name}
        Step Name: ${step.name}
        Step Description: ${step.description}
        User's regeneration request: ${regenerationPrompt}
        
        INSTRUCTIONS:
        1. Create a new activity to replace the existing one based on the user's request.
        2. The activity should fit within the current step and overall pathway structure.
        3. Be creative and consider different types of learning materials (reading content, PDFs, videos, quizzes).
        4. If creating quiz questions, make them challenging and educational.
        
        CONTEXT:
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
          name: "generateActivity",
          description:
            "Generates a replacement activity for a learning pathway step.",
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

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }],
        functions,
        function_call: { name: "generateActivity" },
        temperature: 0.7,
      });

      // Parse the function call response
      const generatedActivity = JSON.parse(
        completion.choices[0].message.function_call.arguments
      );

      return {
        success: true,
        regeneratedItem: generatedActivity,
      };
    } else {
      return createError({
        statusCode: 400,
        statusMessage: "Invalid item type for regeneration",
      });
    }
  } catch (error) {
    console.error("Error regenerating content:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Failed to regenerate content",
    });
  }
});
