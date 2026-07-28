export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
       return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }});
    }
    
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const payload = await request.json();
      const { snapshot, macroHistory, chronicleArray } = payload;
      const apiKey = env.GEMINI_API_KEY;

      if (!apiKey) {
        return new Response('API Key not configured', { status: 500 });
      }

      // Prepara o prompt do Gemini
      const prompt = `Você é o Conselheiro Imperial. Nosso império possui ${snapshot.territoryCount} regiões, ${snapshot.militarySize} exércitos e tesouro de [Ouro: ${snapshot.treasury[0]}, Comida: ${snapshot.treasury[1]}, Prod: ${snapshot.treasury[2]}]. Nossa história até aqui: ${macroHistory}. Relatórios recentes: ${chronicleArray.join('; ')}. Forneça seu conselho dramático estruturado EXATAMENTE com este schema JSON, sem blocos de código Markdown nem texto extra: {"advice": "mensagem dramática", "epoch_summary": "resumo temporal curto"}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      });

      if (!geminiResponse.ok) {
        throw new Error('Gemini API Error');
      }

      const geminiData = await geminiResponse.json();
      const text = geminiData.candidates[0].content.parts[0].text;
      
      return new Response(text, { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};
