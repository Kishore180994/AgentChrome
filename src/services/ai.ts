import { storage } from '../utils/storage';
import { processWithGemini } from './gemini';
import { chatWithOpenAI, analyzeImageWithOpenAI } from './openai/api';

interface AIResponse {
  text: string;
  error?: boolean;
  errorDetails?: {
    type: string;
    message: string;
    code?: string;
    action?: string;
  };
}

export async function processWithAI(imageData?: string, transcript?: string): Promise<AIResponse> {
  try {
    const { aiProvider } = await storage.get(['aiProvider']);
    
    if (!transcript && !imageData) {
      throw new Error('No input provided');
    }

    let response;
    switch (aiProvider) {
      case 'openai':
        response = imageData 
          ? await analyzeImageWithOpenAI(imageData)
          : await chatWithOpenAI(transcript || '');
        break;
      case 'gemini':
        response = await processWithGemini(imageData, transcript || '');
        break;
      default:
        // Default to OpenAI if no provider specified
        response = imageData 
          ? await analyzeImageWithOpenAI(imageData)
          : await chatWithOpenAI(transcript || '');
    }

    if (response.error) {
      throw new Error(response.text || 'Error processing request');
    }

    return {
      text: response.text,
      error: false
    };
  } catch (error: any) {
    console.error('AI Processing error:', error);
    
    let errorDetails = {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      action: 'Please try again or check your connection.'
    };

    if (error.message?.includes('API key')) {
      errorDetails = {
        type: 'API_KEY_MISSING',
        message: 'API key is missing or invalid',
        action: 'Please check your API key in the settings.'
      };
    } else if (error.message?.includes('network')) {
      errorDetails = {
        type: 'NETWORK_ERROR',
        message: 'Network connection error',
        action: 'Please check your internet connection and try again.'
      };
    } else if (error.message?.includes('rate limit')) {
      errorDetails = {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        action: 'Please wait a moment before trying again.'
      };
    }

    return {
      text: error.message || 'An error occurred while processing your request.',
      error: true,
      errorDetails
    };
  }
}