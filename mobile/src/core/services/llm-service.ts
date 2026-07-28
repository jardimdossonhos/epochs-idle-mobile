export async function fetchImperialAdvice(
  snapshot: { treasury: number[]; militarySize: number; territoryCount: number },
  macroHistory: string,
  chronicleArray: string[]
): Promise<{ advice: string; epoch_summary: string }> {
  
  const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
  if (!proxyUrl) {
    return Promise.reject("Proxy URL not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s Timeout

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot, macroHistory, chronicleArray }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    return data; // { advice, epoch_summary }
    
  } catch (err) {
    clearTimeout(timeoutId);
    // Silent Fallback - Rejeitamos para que o `catch` do useGameEngine faça o Graceful Degradation
    return Promise.reject(err);
  }
}
