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

    // Construct the system prompt
    const systemPrompt = `
      Your role is to flesh out a learning pathway. I'm going to give you details for a pathway, and I need you to provide a series of steps and activities that the user can take to achieve the learning goals.
      
      Pathway name: ${pathway_name}
      Pathway overview: ${pathway_overview}
      Pathway learning outcomes: ${pathway_learning_outcomes}
      Pathway Audience: ${audience}
      Pathway Rationale: ${rationale}


      IMPORTANT RULES:
      1. The four types of activities you can pick from are Read, Discuss, Reflect and Practice. Make sure you stick to these activity types.
      2. Don't include the step numbers in the response e.g. Step 1, Step 2, etc. Just the title of the step.
      3. For the 'Read' activiites, use the Document and Page number provided in the context to reference the source material.
      4. Make sure to format the Document name to some more readable. e.g. 'Document: Timothy_Keller_Center_Church.pdf' should be 'Center Church by Timothy Keller'.
      5. For the Read activities, estimate a page range as well. e.g. 'Read pages 10-20 of Center Church by Timothy Keller'.
      6. Each pathway should be between 4-7 steps long, with 2-4 activities per step.
      
      CONTEXT:
      Use the following context to generate the pathway steps and activities:
      ${relevantChunks
        .map(
          (chunk) =>
            `${chunk.text} (Document: ${chunk.metadata.document}, Page: ${chunk.metadata.page})`
        )
        .join("\n")}
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
                            "Type of the activity. The four types of activities are Read, Discuss, Reflect and Practice.",
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
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      max_completion_tokens: 2000,
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
