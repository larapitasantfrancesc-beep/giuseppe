import { Handler, HandlerEvent } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    const { message, history } = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    const contents = [
      ...(history || []),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{
              text: `You are Giuseppe, the official virtual assistant for Pizzeria La Ràpita. Your role is to be a friendly, Mediterranean digital waiter.

IMPORTANT RULES:
1. Language: Default Catalan, adapt to user's language (Catalan/Spanish/English/Italian)
2. Closing Days: Mon-Tue closed (Nov 1-Holy Week), Mon only (Holy Week-Oct)
3. Ordering: Guide to pizzerialarapita.com, cannot take orders directly
4. Tone: Cheerful, use "bon profit!" and "això sí que és una bona tria!"

Opening Hours:
- Nov-Holy Week: Wed-Sun 19:00-23:30h
- Holy Week-Oct: Tue-Sun 19:00-00:00h

Delivery: €1.50 La Ràpita, €2.00 Alcanar platja
Promotions: Pizza+Lambrusco, Pizza+Ice Cream, 3rd pizza 50% off

Pizza Menu (selected):
- BURRATA €12.90, LA RÀPITA €14.90, MORTADEL·LA €12.90, ORÍGENS €11.90
- Margherita €9.70, Carbonara €12.90, 4 Formatges €12.90, Giuseppe €12.90
- RÚCULA €13.70, Cherry €14.70, Vegetariana €11.20

Ice Creams: Gelateria Lumalú 300g tubs (8 flavors)`
            }],
          },
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to get response from AI' }),
      };
    }

    const data = await response.json();
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ho sento, no he pogut generar una resposta.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: botResponse }),
    };
  } catch (error) {
    console.error('Error in chat function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };
