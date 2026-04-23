import { corsHeaders } from '../_shared/cors.ts';

type ProductContext = {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
};

type SearchRequest = {
  query: string;
  products: ProductContext[];
};

const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? '';
const groqModel = 'llama-3.3-70b-versatile';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function buildPrompt(query: string, products: ProductContext[]) {
  const catalog = products.slice(0, 700).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    unit: product.unit,
    inStock: product.inStock,
  }));

  return [
    {
      role: 'system',
      content:
        'You help shoppers search a supermarket catalog. Return strict JSON with keys "answer" and "productIds". The answer must be short, natural, and grounded only in the provided catalog. productIds must contain exact matching product ids from the catalog only.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        query,
        catalog,
      }),
    },
  ];
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!groqApiKey) {
      return jsonResponse({ error: 'Missing GROQ_API_KEY secret.' }, 500);
    }

    const body = (await request.json()) as SearchRequest;
    const query = body.query?.trim();
    const products = body.products ?? [];

    if (!query) {
      return jsonResponse({ error: 'Search query is required.' }, 400);
    }

    if (products.length === 0) {
      return jsonResponse({ answer: 'No catalog items were provided.', productIds: [] });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: buildPrompt(query, products),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return jsonResponse({ error: payload?.error?.message ?? 'Groq search failed.' }, response.status);
    }

    const content = payload?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const validProductIds = new Set(products.map((product) => product.id));
    const productIds = Array.isArray(parsed.productIds)
      ? parsed.productIds.filter((id: unknown): id is number => typeof id === 'number' && validProductIds.has(id)).slice(0, 12)
      : [];

    return jsonResponse({
      answer: typeof parsed.answer === 'string' ? parsed.answer : 'Here are the closest products I found.',
      productIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
