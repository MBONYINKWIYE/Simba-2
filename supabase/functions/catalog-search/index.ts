const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { query, products } = await req.json()

    if (!query) {
      throw new Error('Search query is required.')
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
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert personal shopper for Simba Supermarket. Analyze user intent and suggest products. Return strict JSON: {"answer": "reasoning (2 sentences)", "productIds": [ids]}'
          },
          { role: 'user', content: JSON.stringify({ query, catalog }) }
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Groq API error')
    }

    const data = await response.json()
    const aiContent = JSON.parse(data.choices[0].message.content)

    return new Response(JSON.stringify(aiContent), {
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
