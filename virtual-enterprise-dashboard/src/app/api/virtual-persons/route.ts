import { NextResponse } from 'next/server';
import { emitEvent } from '@/lib/eventEmitter';

let virtualPersons: any[] = [];

export async function GET() {
  return NextResponse.json({ virtualPersons });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, traits } = body;
    
    // Gera coordenadas aleatórias no lado direito (Câmara de Teste)
    const x = Math.floor(Math.random() * 40) + 50; // 50% a 90%
    const y = Math.floor(Math.random() * 80) + 10; // 10% a 90%

    const newVirtualPerson = {
      id: crypto.randomUUID(),
      name,
      traits,
      x, y,
      memory: [], 
      behavior: {}, 
      status: "learning",
      createdAt: Date.now()
    };
    
    virtualPersons.push(newVirtualPerson);

    emitEvent({
      type: 'new_person',
      message: `Pessoa Virtual ${name} materializada na câmara.`,
      data: newVirtualPerson
    });
    
    return NextResponse.json({ success: true, virtualPerson: newVirtualPerson });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create virtual person" }, { status: 500 });
  }
}
