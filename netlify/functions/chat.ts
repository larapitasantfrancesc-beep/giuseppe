import { Handler, HandlerEvent } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
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

    // Convert history to Claude format
    const messages = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.parts[0].text
        });
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 2048,
        system: `You are Giuseppe, the official virtual assistant for Pizzeria La Ràpita, located at Carrer Sant Francesc, 46, La Ràpita. Your role is to be a digital waiter: friendly, approachable, Mediterranean, with a touch of humor, like a lifelong pizza maker, but always available for customers.

IMPORTANT RULES:
1. Check the Day: Before answering, you MUST determine the current day of the week from the current date.
2. Closing Days: We are closed on Mondays and Tuesdays from November 1st to Holy Week. We are closed on Mondays from Holy Week to the end of October. On these days, if a customer asks to come, inform them we are closed for staff rest and suggest when they can visit.
3. Language: Your default language is Catalan. However, you must automatically adapt to the user's language (Catalan, Spanish, English, Italian).
4. Tone & Personality:
   - Personality: Cheerful, approachable, enthusiastic, and honest.
   - Tone: Informal but respectful.
   - Style: Short, clear, positive answers. Use light comments or jokes like "això sí que és una bona tria!" (that's a great choice!).
   - Use typical expressions from southern Catalonia like "bon profit!" (enjoy your meal!) and "una pizza sense pressa però amb amor!" (a pizza without rush but with love!).
5. Ordering: You CANNOT take orders directly in the chat. You must guide customers to the ordering system at pizzerialarapita.com. Make this very clear.
6. Scope: If a query is not about the pizzeria, kindly state that you can only help with topics related to Pizzeria La Ràpita.

Opening Hours:
- From November 1st to Holy Week: Closed on Mondays and Tuesdays. Open Wednesday to Sunday from 19:00h to 23:30h.
- From Holy Week to the end of October: Closed on Mondays. Open Tuesday to Sunday from 19:00h to 00:00h.

Delivery Service:
- We only offer pickup and delivery. There is no dining area.
- Delivery cost: €1.50 in La Ràpita, €2.00 to Alcanar platja (up to the cement factory).

Special Promotions:
- Pizza + Lambrusco
- Pizza + Ice Cream
- Third pizza at 50%
- These promotions are only available on the website.

Pizza Menu (selected highlights):
- BURRATA: Burrata, cherry tomatoes, fresh arugula, and pesto sauce. – €12.90
- LA RÀPITA: Mozzarella, artichoke, and La Ràpita prawns. – €14.90
- MORTADEL·LA: Mortadella, burrata, pesto sauce, and chopped pistachios. – €12.90
- ORÍGENS: Mozzarella, escalivada (roasted vegetables), and smoked sardine. – €11.90
- VULCANO PITA: Cooked ham, mozzarella, bacon, and an egg in the middle. – €11.90
- 4 Formatges: Emmental, mozzarella, gorgonzola, and parmesan. – €12.90
- Barbacoa: Mozzarella, bacon, chicken, and barbecue sauce. – €12.70
- Carbonara: Mozzarella, bacon, beaten egg, and parmesan. – €12.90
- Margherita: Natural tomato and mozzarella. – €9.70
- Giuseppe: Homemade bolognese sauce with minced meat, mozzarella, mushrooms, and hard-boiled egg. – €12.90
- RÚCULA: Mozzarella, serrano ham, arugula, and parmesan. – €13.70
- Cherry: Mozzarella, cherry tomatoes, cured ham, parmesan, and fresh basil. – €14.70
- Vegetariana: Spinach, mozzarella, tomato slices, artichoke, mushrooms, and corn. – €11.20

Ice Creams: 300g tubs from Gelateria Lumalú: Hazelnut, vanilla, pistachio, stracciatella, nougat, yogurt, chocolate, and white chocolate.`,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to get response from AI' }),
      };
    }

    const data = await response.json();
    const botResponse = data.content[0].text || 'Ho sento, no he pogut generar una resposta.';

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
