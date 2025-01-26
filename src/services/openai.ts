import { storage } from "../utils/storage";

interface OpenAIResponse {
  text: string;
  error?: string;
}

export async function processWithOpenAI(
  imageData?: string,
  transcript?: string
): Promise<OpenAIResponse> {
  try {
    const { openaiKey } = await storage.get(["openaiKey"]);

    if (!openaiKey) {
      throw new Error("OpenAI API key not found. Please add it in settings.");
    }

    const messages: Array<{ role: string; content: string }> = [];

    // Add transcript if available
    if (transcript) {
      messages.push({
        role: "user",
        content: transcript,
      });
    }

    // Add image prompt if available
    if (imageData) {
      messages.push({
        role: "user",
        content: `Analyze the following image: ${imageData}`,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: imageData ? "gpt-4" : "gpt-4",
        messages,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Error processing with OpenAI");
    }

    return {
      text: data.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error processing with OpenAI:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
