import { OpenAI } from "openai";
import { createError } from "h3";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

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

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<PathwayDetailsRequest>(event);
    const { prompt } = body;

    if (!prompt) {
      return createError({
        statusCode: 400,
        message: "Prompt is required",
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Use your preferred model
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that helps create educational pathway details from natural language prompts.",
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

    return pathwayDetails;
  } catch (error) {
    console.error("Error generating pathway details:", error);
    return createError({
      statusCode: 500,
      message: "Failed to generate pathway details",
    });
  }
});
