const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CatalogSearchContext = {
  intent: string;
  occasion: string | null;
  audience: string | null;
  budget: string | null;
  urgency: string | null;
  dietaryPreference: string | null;
  mood: string | null;
  season: string | null;
  valuePreference: string | null;
  productHints: string[];
  brandHints: string[];
  normalizedQuery: string;
};

function buildContextSummary(context: CatalogSearchContext) {
  const parts: string[] = [];

  if (context.occasion) parts.push(context.occasion);
  if (context.mood) parts.push(context.mood);
  if (context.season) parts.push(context.season);
  if (context.dietaryPreference) parts.push(context.dietaryPreference);
  if (context.valuePreference) parts.push(context.valuePreference);
  if (context.audience) parts.push(`for ${context.audience}`);
  if (context.budget) parts.push(`budget around ${context.budget}`);
  if (context.urgency) parts.push(context.urgency);
  if (context.brandHints.length > 0) parts.push(`brands: ${context.brandHints.join(', ')}`);

  return parts.length > 0 ? `${context.intent}: ${parts.join(', ')}` : context.intent;
}

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('Missing GROQ_API_KEY secret.')
    }

    const { query, products, context } = await req.json()

    if (!query) {
      throw new Error('Search query is required.')
    }

    const safeContext: CatalogSearchContext = context ?? {
      intent: 'shopping search',
      occasion: null,
      audience: null,
      budget: null,
      urgency: null,
      dietaryPreference: null,
      mood: null,
      season: null,
      valuePreference: null,
      productHints: [],
      brandHints: [],
      normalizedQuery: String(query).trim().toLowerCase(),
    }

    // Prepare catalog context for the AI with more detail for reasoning
    const catalog = products.slice(0, 600).map((p: { id: number; name: string; category: string; price: number; unit: string; inStock: boolean }) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      unit: p.unit, // Added unit for reasoning about quantity/size
      inStock: p.inStock
    }))

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3, // Lower temperature for more consistent reasoning
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are Simba AI, a sophisticated personal shopping expert for Simba Supermarket.',
              'Your mission: Interpret the user\'s situational need and logically construct a shopping solution.',
              'Reasoning Guidelines:',
              '1. SITUATIONAL INTELLIGENCE: If the user says "dinner", "party", "breakfast", or "I am sick", identify the core ingredients or solutions needed. Don\'t just look for those words; look for the products that fit the context.',
              'Example Logic for "dinner": Select a Protein (Meat/Fish), a Base (Rice/Pasta/Flour), and supporting items (Oil/Vegetables/Spices) to propose a complete logical meal solution.',
              '2. QUANTITY REASONING: Use the "unit" field to distinguish between small items and bulk/family packs based on the user\'s tone (e.g., "many", "all", "large" vs "one", "small").',
              '3. VALUE LOGIC: Prioritize premium brands if they sound like they want "the best", or affordable staples for budget requests.',
              '4. EXPLAIN YOUR LOGIC: In the "answer" field, speak directly to the user. Explain WHY these specific products were chosen for their situation (e.g., "Since you\'re planning a dinner, I\'ve suggested these fresh meats and grains as a base...").',
              'Return strict JSON: {"answer": "Your expert reasoning (2-3 sentences)", "productIds": [number_ids]}',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              query,
              context: {
                ...safeContext,
                summary: buildContextSummary(safeContext),
              },
              catalog,
            }),
          }
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Groq API error')
    }

    const data = await response.json()
    const aiContent = JSON.parse(data.choices[0].message.content)

    // Robust ID extraction: handle numbers or strings that look like numbers
    const rawIds = Array.isArray(aiContent.productIds) ? aiContent.productIds : []
    const validatedIds = rawIds
      .map((id: string | number) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0)

    return new Response(JSON.stringify({
      answer: aiContent.answer,
      productIds: Array.from(new Set(validatedIds)).slice(0, 15), // Increased limit for better variety
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
