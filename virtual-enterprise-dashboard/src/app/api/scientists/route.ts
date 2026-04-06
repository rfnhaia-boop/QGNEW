import { NextResponse } from 'next/server';
import { emitEvent } from '@/lib/eventEmitter';

let scientists: any[] = [];

export async function GET() {
  return NextResponse.json({ scientists });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, specialization } = body;
    
    // Gera coordenadas aleatórias no lado esquerdo (Área dos Cientistas)
    const x = Math.floor(Math.random() * 30) + 5; // 5% a 35%
    const y = Math.floor(Math.random() * 80) + 10; // 10% a 90%

    const newScientist = {
      id: crypto.randomUUID(),
      name,
      specialization,
      x, y,
      memory: [], 
      rules: [],
      status: "active",
      createdAt: Date.now()
    };
    
    scientists.push(newScientist);
    
    emitEvent({
      type: 'new_scientist',
      message: `Cientista ${name} entrou no laboratório.`,
      data: newScientist
    });
    
    return NextResponse.json({ success: true, scientist: newScientist });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create scientist" }, { status: 500 });
  }
}
