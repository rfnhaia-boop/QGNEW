import { NextResponse } from 'next/server';

let experiments: any[] = [];

export async function GET() {
  return NextResponse.json({ experiments });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scientist_id, person_id, action } = body;
    
    // Logica de validacao (Critic) mock
    const isValid = true; // Substituir logica JSON/Rag
    
    const proposal = {
      id: crypto.randomUUID(),
      scientist_id,
      person_id,
      action,
      status: isValid ? "approved" : "rejected",
      timestamp: Date.now()
    };
    
    experiments.push(proposal);
    
    if (isValid) {
      // ExecuteAction seria disparado aqui chamando LLM
      proposal.status = 'executed';
    }
    
    return NextResponse.json({ success: true, experiment: proposal });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 });
  }
}
