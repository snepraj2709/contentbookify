
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
      ...options
    };
    
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
        I want you to generate a book cover image based on the following description:
        
        ${data.prompt}
        
        The book title is: ${data.title || "Untitled Book"}
        The author is: ${data.author || "Anonymous"}
        
        Generate a detailed, high-quality book cover design suitable for a professional publication.
        `;
        
        console.log("Generating cover with prompt:", imagePrompt);
        
        // Call Gemini for image generation
        const imageResponse = await callGeminiAPI("gemini-pro", imagePrompt);
        const imageData = await imageResponse.json();
        
        // Extract the text response (a description of what the image would look like)
        const coverDescription = imageData.candidates?.[0]?.content?.parts?.[0]?.text || 
          "Sorry, I couldn't generate a cover image description.";
          
        result = { 
          description: coverDescription,
          message: "In a real implementation, this would generate an actual image URL. For now, you'll need to use a placeholder image."
        };
        break;
      
      case "generateChapterSummary":
        if (!data?.content) {
          throw new Error("Missing content for chapter summary generation");
        }
        
        // Format the prompt for chapter summary
        const summaryPrompt = `
        Summarize the following article content into a concise chapter summary of about 100-200 words.
        Make it engaging and highlight the key points.
        
        Content:
        ${data.content}
        `;
        
        console.log("Generating summary for chapter:", data.title || "Untitled Chapter");
        
        // Call Gemini for text summarization
        const summaryResponse = await callGeminiAPI("gemini-pro", summaryPrompt);
        const summaryData = await summaryResponse.json();
        
        // Extract the summary text
        const summary = summaryData.candidates?.[0]?.content?.parts?.[0]?.text || 
          "Failed to generate a summary.";
          
        result = { summary };
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
