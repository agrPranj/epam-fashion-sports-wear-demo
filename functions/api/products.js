/**
 * API endpoint to expose products data
 */
export async function get(request) {
  try {
    // Import products data
    const { default: products } = await import('../../data/products.json', {
      assert: { type: 'json' },
    });

    // Return JSON response
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
