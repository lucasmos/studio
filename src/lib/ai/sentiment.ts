import { HfInference } from '@huggingface/inference';

// It's good practice to use environment variables for API keys.
// However, per instruction, using the provided key directly.
const HF_TOKEN = process.env.HF_TOKEN || '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';

const hf = new HfInference(HF_TOKEN);

/**
 * Analyzes the sentiment of a given text headline using FinBERT.
 * 
 * @param headline The text headline to analyze.
 * @returns A promise that resolves to the sentiment analysis result.
 *          The result is an array of objects, each containing a label (e.g., 'positive', 'negative', 'neutral')
 *          and a score (confidence).
 * @throws Will throw an error if the Hugging Face API call fails.
 */
export async function analyzeSentiment(headline: string): Promise<Array<{ label: string; score: number }>> {
  try {
    const result = await hf.textClassification({
      model: 'ProsusAI/finbert',
      inputs: headline,
    });
    // Ensure the result is in the expected format.
    // The actual type from HfInference might be more complex, so we cast it.
    return result as Array<{ label: string; score: number }>;
  } catch (error) {
    console.error("Error analyzing sentiment with Hugging Face API:", error);
    // Implement retry logic or fallback if necessary, per requirements.
    // For now, re-throwing the error.
    throw error;
  }
}
