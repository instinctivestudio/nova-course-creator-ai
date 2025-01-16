import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

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
      topK: 10,
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

    // Construct the system prompt
    const systemPrompt = `
      Your role is to flesh out a learning pathway. I'm going to give you details for a pathway, and I need you to provide a series of steps and activities that the user can take to achieve the learning goals.
      
      Pathway name: ${pathway_name}
      Pathway overview: ${pathway_overview}
      Pathway learning outcomes: ${pathway_learning_outcomes}
      Pathway Audience: ${audience}
      Pathway Rationale: ${rationale}
      
      CONTEXT:
      Use the following context to generate the pathway steps and activities:
      ${relevantChunks.map((chunk) => chunk.text).join("\n")}
    `;

    // Define the function for OpenAI
    const functions = [
      {
        name: "generateLearningPathway",
        description:
          "Generates an array of pathway steps, each containing one or more activities.",
        parameters: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              description:
                "List of steps in the learning pathway. Each step includes its name and an array of activities.",
              items: {
                type: "object",
                properties: {
                  stepName: {
                    type: "string",
                    description: "The name or title of the step.",
                  },
                  activities: {
                    type: "array",
                    description: "A list of activities under this step.",
                    items: {
                      type: "object",
                      properties: {
                        activityType: {
                          type: "string",
                          description:
                            "Type of the activity (e.g., read, watch, quiz, discuss).",
                        },
                        title: {
                          type: "string",
                          description: "A concise title for the activity.",
                        },
                        description: {
                          type: "string",
                          description:
                            "A brief summary or instructions for the activity.",
                        },
                      },
                      required: ["activityType", "title", "description"],
                    },
                  },
                },
                required: ["stepName", "activities"],
              },
            },
          },
          required: ["steps"],
        },
      },
    ];

    // Make OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: systemPrompt }],
      functions,
      function_call: { name: "generateLearningPathway" },
    });

    // Parse the function call response
    const functionResponse = JSON.parse(
      completion.choices[0].message.function_call.arguments
    );

    // Return the generated pathway
    return {
      pathway_name,
      steps: functionResponse.steps,
      metadata: {
        sources: relevantChunks.map((chunk) => chunk.metadata),
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
