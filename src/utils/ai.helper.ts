import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN); // Get free token from huggingface.co

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const result = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2", // 384 dimensions
      inputs: text,
    });
    return result as number[];
  } catch (error) {
    console.error("AI Embedding Error:", error);
    return [];
  }
};
