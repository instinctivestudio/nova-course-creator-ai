import { OpenAI } from "openai";
import { createError, H3Event, getRequestHeader } from "h3";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const index = process.env.PINECONE_INDEX_NAME
  ? pinecone.index(process.env.PINECONE_INDEX_NAME)
  : pinecone.index("default-index"); // Fallback index name

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

interface PathwayDetailsRequest {
  prompt: string;
}

interface PathwayDetails {
  title: string;
  description: string;
  learningOutcomes: string;
  targetAudience: string;
  whyTakeIt: string;
}

interface ChunkMetadata {
  document: string;
  page: string | number;
}

interface RelevantChunk {
  text: string;
  metadata: ChunkMetadata;
}

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication before proceeding
    checkAuth(event);

    const body = await readBody<PathwayDetailsRequest>(event);
    const { prompt } = body;

    if (!prompt) {
      return createError({
        statusCode: 400,
        message: "Prompt is required",
      });
    }

    // Get embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: prompt,
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

    // Include relevant context in the system message
    const contextText = relevantChunks
      .map(
        (chunk) =>
          `${chunk.text} (Document: ${chunk.metadata.document}, Page: ${chunk.metadata.page})`
      )
      .join("\n\n");

    console.log("Context text:", contextText);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use your preferred model
      messages: [
        {
          role: "system",
          content: `You are an assistant that helps create educational pathway details from natural language prompts. You are given a prompt and you need to generate a detailed pathway description, learning outcomes, target audience, and compelling reasons why someone should take the pathway.
            The pathway description should be a comprehensive overview of what the pathway covers.
            The learning outcomes should be specific skills or knowledge learners will gain from completing the pathway.
            The target audience should be a description of who would benefit most from taking this pathway.
            The compelling reasons why someone should take the pathway should be a list of reasons why someone should take the pathway.
            
            Use the following context from our knowledge base to inform your response:
            ${contextText}
            `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      functions: [
        {
          name: "generate_pathway_details",
          description:
            "Generate detailed information for a pathway based on a prompt",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "A concise, engaging title for the pathway",
              },
              description: {
                type: "string",
                description:
                  "A comprehensive overview of what the pathway covers",
              },
              learningOutcomes: {
                type: "string",
                description:
                  "Specific skills or knowledge learners will gain from completing the pathway",
              },
              targetAudience: {
                type: "string",
                description:
                  "Description of who would benefit most from taking this pathway",
              },
              whyTakeIt: {
                type: "string",
                description:
                  "Compelling reasons why someone should take this pathway",
              },
            },
            required: [
              "title",
              "description",
              "learningOutcomes",
              "targetAudience",
              "whyTakeIt",
            ],
          },
        },
      ],
      function_call: { name: "generate_pathway_details" },
    });

    const functionCall = response.choices[0]?.message?.function_call;

    if (!functionCall) {
      return createError({
        statusCode: 500,
        message: "Failed to generate pathway details",
      });
    }

    const pathwayDetails = JSON.parse(functionCall.arguments) as PathwayDetails;

    // Include metadata about the sources used
    return {
      ...pathwayDetails,
      metadata: {
        sources: relevantChunks.map((chunk) => chunk.metadata),
      },
    };
  } catch (error) {
    console.error("Error generating pathway details:", error);
    return createError({
      statusCode: 500,
      message: "Failed to generate pathway details",
    });
  }
});
