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
  productHints: string[];
  normalizedQuery: string;
};

function buildContextSummary(context: CatalogSearchContext) {
  const parts: string[] = [];

  if (context.occasion) {
    parts.push(context.occasion);
  }

  if (context.audience) {
    parts.push(`for ${context.audience}`);
  }

  if (context.dietaryPreference) {
    parts.push(context.dietaryPreference);
  }

  if (context.budget) {
    parts.push(`budget around ${context.budget}`);
  }

  if (context.urgency) {
    parts.push(context.urgency);
  }

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
      productHints: [],
      normalizedQuery: String(query).trim().toLowerCase(),
    }

    // Prepare catalog context for the AI
    const catalog = products.slice(0, 500).map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
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
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are an expert personal shopper for Simba Supermarket.',
              'Interpret the user query as a shopping mission, not just keywords.',
              'If the user describes a situation, infer the likely need and suggest products that solve it.',
              'Use the provided search context to understand occasion, audience, budget, urgency, and dietary preference.',
              'If context is missing or vague, still make the best reasonable inference from the wording.',
              'Return strict JSON: {"answer": "2 short sentences with the inferred need and suggestions", "productIds": [ids]}',
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

    return new Response(JSON.stringify({
      answer: aiContent.answer,
      productIds: Array.isArray(aiContent.productIds)
        ? Array.from(new Set(aiContent.productIds.filter((id: unknown) => typeof id === 'number'))).slice(0, 8)
        : [],
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
