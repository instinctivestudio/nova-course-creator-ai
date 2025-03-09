// Define an interface for the request body
interface AuthRequest {
  password: string;
}

// Define an interface for the response
interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
}

export default defineEventHandler(async (event) => {
  try {
    // Get the request body
    const body = await readBody<AuthRequest>(event);

    // Simple password validation - you can replace this with your desired password
    const CORRECT_PASSWORD = process.env.APP_PASSWORD || "nova2024";

    if (!body || !body.password) {
      return {
        success: false,
        message: "Password is required",
      } as AuthResponse;
    }

    // Check if the password is correct
    if (body.password === CORRECT_PASSWORD) {
      return {
        success: true,
        token: "valid_token_" + Date.now(), // Simple token generation
      } as AuthResponse;
    } else {
      return {
        success: false,
        message: "Incorrect password",
      } as AuthResponse;
    }
  } catch (error) {
    console.error("Auth API error:", error);
    return {
      success: false,
      message: "Server error during authentication",
    } as AuthResponse;
  }
});
