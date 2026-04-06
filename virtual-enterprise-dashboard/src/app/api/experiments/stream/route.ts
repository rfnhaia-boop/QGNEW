import { NextResponse } from 'next/server';
import { addClient, removeClient } from '@/lib/eventEmitter';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);
      
      // Envia evento de conexão inicial
      controller.enqueue(`data: ${JSON.stringify({ type: 'sys', message: 'Conectado ao Stream de Laboratório' })}\n\n`);

      request.signal.addEventListener('abort', () => {
        removeClient(controller);
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
