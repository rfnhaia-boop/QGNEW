/* ==========================================================================
   LLM API ROUTE — Proxies requests to Google Gemini
   ========================================================================== */

import { NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, systemPrompt, temperature = 0.7 } = body;

    if (!API_KEY) {
      return NextResponse.json({ text: 'API key não configurada. Usando mock.', model: 'mock' }, { status: 200 });
    }

    // Montar conteúdo para Gemini
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
        topP: 0.95,
        topK: 40,
      },
    };

    const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      return NextResponse.json({ text: 'Erro ao chamar Gemini. Usando mock.', model: 'mock' }, { status: 200 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta do Gemini.';

    return NextResponse.json({
      text,
      model: 'gemini-2.0-flash',
      tokensUsed: data?.usageMetadata?.totalTokenCount,
    });
  } catch (error) {
    console.error('LLM route error:', error);
    return NextResponse.json({ text: 'Erro interno. Usando mock.', model: 'mock' }, { status: 200 });
  }
}
