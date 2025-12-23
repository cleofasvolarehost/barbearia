
export async function generateAIResponse(prompt: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY; // User might have put it in .env

  if (!key) {
    console.error('OpenAI: Missing API Key');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Cost-effective
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a barber shop management system. Your goal is to generate professional, friendly, and converting WhatsApp messages for clients. Keep them short, include emojis, and use Portuguese (Brazil)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Network Error:', error);
    return null;
  }
}
