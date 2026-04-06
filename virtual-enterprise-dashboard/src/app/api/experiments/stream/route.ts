import { NextResponse } from 'next/server';

// Uma estrutura simples de EventEmitter para gerir SSE (Server-Sent Events) no Next.js
// Num cenário ideal de produção, usaríamos Redis PubSub ou o Temporal.
let clients: ReadableStreamDefaultController[] = [];

export function emitEvent(data: any) {
  clients.forEach((client) => {
    try {
      client.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);
      
      // Envia evento de conexão inicial
      controller.enqueue(`data: ${JSON.stringify({ type: 'sys', message: 'Conectado ao Stream de Laboratório' })}\n\n`);

      request.signal.addEventListener('abort', () => {
        clients = clients.filter(c => c !== controller);
        try {
          controller.close();
        } catch(e) {}
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
