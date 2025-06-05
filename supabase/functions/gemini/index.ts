
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to call the Gemini API
async function callGeminiAPI(
  model: string,
  prompt: string,
  options: any = {}
): Promise<Response> {
  try {
    const url = `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      ...options
    };
    
    console.log("Calling Gemini API with URL:", url);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    const { action, data } = await req.json();
    
    if (!action) {
      throw new Error("Missing 'action' parameter");
    }
    
    let result;
    
    switch (action) {
      case "generateCoverImage":
        if (!data?.prompt) {
          throw new Error("Missing prompt for cover generation");
        }
        
        // Format the prompt for cover image generation
        const imagePrompt = `
        Create a detailed description for a book cover design based on the following:
        
        Book Title: ${data.title || "Untitled Book"}
        Author: ${data.author || "Anonymous"}
        Description: ${data.prompt}
        
        Provide a vivid, detailed description of what the book cover should look like, including:
        - Visual style and color scheme
        - Typography suggestions
        - Layout and composition
        - Any symbolic elements or imagery
        - Overall mood and feeling
        
        Make it professional and appealing for the target audience.
        `;
        
        console.log("Generating cover with prompt for title:", data.title);
        
        // Call Gemini for cover description using the correct model
        const imageResponse = await callGeminiAPI("gemini-1.5-flash", imagePrompt);
        const imageData = await imageResponse.json();
        
        // Extract the text response
        const coverDescription = imageData.candidates?.[0]?.content?.parts?.[0]?.text || 
          "Sorry, I couldn't generate a cover image description.";
          
        result = { 
          description: coverDescription,
          message: "Cover design description generated successfully. You can use this description with an image generation service."
        };
        break;
      
      case "generateChapterSummary":
        if (!data?.content) {
          throw new Error("Missing content for chapter summary generation");
        }
        
        // Format the prompt for chapter summary
        const summaryPrompt = `
        Please create a compelling chapter summary for the following article content. 
        The summary should be 100-150 words and capture the main points and key insights.
        Make it engaging and informative for readers who want to understand what this chapter covers.
        
        Article Title: ${data.title || "Untitled Chapter"}
        
        Content to summarize:
        ${data.content.substring(0, 3000)}${data.content.length > 3000 ? '...' : ''}
        
        Please provide only the summary text without any additional formatting or explanations.
        `;
        
        console.log("Generating summary for chapter:", data.title || "Untitled Chapter");
        
        // Call Gemini for text summarization using the correct model
        const summaryResponse = await callGeminiAPI("gemini-1.5-flash", summaryPrompt);
        const summaryData = await summaryResponse.json();
        
        // Extract the summary text
        const summary = summaryData.candidates?.[0]?.content?.parts?.[0]?.text || 
          "Failed to generate a summary. Please edit this description manually.";
          
        result = { summary: summary.trim() };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
