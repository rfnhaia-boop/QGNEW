export let clients: ReadableStreamDefaultController[] = [];

export function emitEvent(data: any) {
  clients.forEach((client) => {
    try {
      client.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

export function addClient(controller: ReadableStreamDefaultController) {
  clients.push(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients = clients.filter(c => c !== controller);
}
