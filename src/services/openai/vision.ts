import { storage } from "../../utils/storage";

interface VisionResponse {
  text: string;
  error?: string;
}

// export async function analyzeImageWithOpenAI(
//   imageData: string
// ): Promise<VisionResponse> {
//   try {
//     // const { openaiKey } = await storage.get(["openaiKey"]);
//     const openaiKey =
//       "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";
//     if (!openaiKey) {
//       throw new Error("OpenAI API key not found");
//     }

//     const response = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${openaiKey}`,
//       },
//       body: JSON.stringify({
//         model: "gpt-4o-mini",
//         messages: [
//           {
//             role: "user",
//             content: [
//               {
//                 type: "image_url",
//                 image_url: {
//                   url: imageData,
//                 },
//               },
//               {
//                 type: "text",
//                 text: "What do you see in this image? Please describe it in detail.",
//               },
//             ],
//           },
//         ],
//         max_tokens: 500,
//       }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.error?.message || "Error processing image");
//     }

//     return {
//       text: data.choices[0].message.content,
//     };
//   } catch (error) {
//     console.error("Vision API error:", error);
//     return {
//       text: "",
//       error: error instanceof Error ? error.message : "Unknown error occurred",
//     };
//   }
// }
