import { storage } from "../utils/storage";

// Google Cloud Vision API integration
export async function analyzeImage(imageData: ImageData): Promise<any> {
  try {
    const { visionKey } = await storage.get(["visionKey"]);

    if (!visionKey) {
      throw new Error("Vision API key not found. Please add it in settings.");
    }

    const response = await fetch(
      "https://vision.googleapis.com/v1/images:annotate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${visionKey}`,
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageData,
              },
              features: [
                { type: "TEXT_DETECTION" },
                { type: "OBJECT_LOCALIZATION" },
                { type: "IMAGE_PROPERTIES" },
              ],
            },
          ],
        }),
      }
    );

    return await response.json();
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
}
