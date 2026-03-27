export const generateChatResponse = async (apiKey, platform, history) => {
  if (!apiKey) throw new Error("Gemini API key is required");
  
  let platformContext = "";
  if (platform === 'facebook') platformContext = "You are a social media assistant for Facebook. Tone: story-driven, conversational, detailed.";
  if (platform === 'vero') platformContext = "You are a social media assistant for VERO. Tone: simple, aesthetic, moderate hashtags.";
  if (platform === 'instagram') platformContext = "You are a social media assistant for Instagram. Tone: engagement-focused, highly visual, story-driven, rich hashtags.";
  if (platform === 'flickr') platformContext = "You are a social media assistant for Flickr. Focus on photography, simple descriptions, no heavy formatting.";

  const contents = history.map((msg, index) => {
    let text = msg.content;
    if (index === 0 && msg.role === 'user') {
       text = `${platformContext}\n\nUser Request: ${text}`;
    }
    const parts = [{ text }];
    if (msg.image && msg.image.data && msg.image.mimeType) {
      parts.push({
        inlineData: {
          mimeType: msg.image.mimeType,
          data: msg.image.data
        }
      });
    }
    return {
      role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
      parts
    };
  });

  const modelsToTry = [
    'gemini-1.5-flash-latest',
    'gemini-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errJson = await response.json();
          if (errJson.error && errJson.error.message) {
            errorDetail = errJson.error.message;
          }
        } catch(e) {}
        
        if (response.status === 404) {
          lastError = new Error(`[${response.status}] ${model}: ${errorDetail}`);
          continue;
        } else {
          throw new Error(`[${response.status}] ${errorDetail}`);
        }
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response generated");

      return text;
    } catch (err) {
      lastError = err;
      if (!err.message.includes('[404]')) throw err;
    }
  }

  throw lastError || new Error("All configured Gemini models failed or were not found for your API key.");
};
