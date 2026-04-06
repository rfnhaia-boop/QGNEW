'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ============================================================
   TIPOS
   ============================================================ */
interface Agent {
  id: string;
  name: string;
  type: 'scientist' | 'person';
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  skinTone: string;
  shirtColor: string;
  phase: number;
  walkTimer: number;
  state: 'idle' | 'walking' | 'working' | 'meeting';
  legSwing: number;
  armSwing: number;
  assignedDesk: number;
  workProgress: number;
}

interface Desk {
  x: number;
  y: number;
  occupied: boolean;
  agentId: string | null;
  row: number;
}

/* ============================================================
   CONSTANTES
   ============================================================ */
const SCIENTIST_NAMES = ['Dr. Pavlov', 'Dra. Curie', 'Dr. Turing', 'Dra. Rosa', 'Dr. Feynman', 'Dra. Ada', 'Dr. Tesla', 'Dr. Hawking'];
const PERSON_NAMES = ['Alpha-01', 'Beta-02', 'Gamma-03', 'Delta-04', 'Epsilon-05', 'Zeta-06', 'Eta-07', 'Theta-08'];
const SKIN_TONES = ['#D4A574', '#C68B59', '#8D5524', '#F1C27D', '#E0AC69', '#FFDBAC'];
const SCI_COLORS = ['#6366f1', '#818cf8', '#7c3aed', '#8b5cf6'];
const PERSON_COLORS = ['#10b981', '#34d399', '#059669', '#14b8a6'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/* ============================================================
   ESCRITÓRIO — Layout
   ============================================================ */
const OFFICE = {
  // O escritório é desenhado relativo a um ponto (ox, oy) = canto superior esquerdo
  width: 800,
  height: 500,
  wallThickness: 4,
  // Cor do chão
  floorColor: '#0c0f1a',
  floorAccent: '#111630',
  wallColor: '#1e2140',
  wallHighlight: '#2a2f5a',
};

function generateDesks(ox: number, oy: number): Desk[] {
  const desks: Desk[] = [];
  // 3 fileiras de 4 mesas cada = 12 estações
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      desks.push({
        x: ox + 180 + col * 130,
        y: oy + 140 + row * 120,
        occupied: false,
        agentId: null,
        row,
      });
    }
  }
  return desks;
}

/* ============================================================
   FUNÇÕES DE DESENHO
   ============================================================ */

function drawOfficeFloor(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const { width, height } = OFFICE;

  // Sombra externa
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(ox + 6, oy + 6, width, height, 8);
  ctx.fill();

  // Chão principal
  ctx.fillStyle = OFFICE.floorColor;
  ctx.beginPath();
  ctx.roundRect(ox, oy, width, height, 8);
  ctx.fill();

  // Padrão de piso (ladrilhos sutis)
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.04)';
  ctx.lineWidth = 0.5;
  for (let x = ox; x < ox + width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + height); ctx.stroke();
  }
  for (let y = oy; y < oy + height; y += 40) {
    ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + width, y); ctx.stroke();
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const { width, height, wallThickness } = OFFICE;

  ctx.strokeStyle = OFFICE.wallColor;
  ctx.lineWidth = wallThickness;
  ctx.beginPath();
  ctx.roundRect(ox, oy, width, height, 8);
  ctx.stroke();

  // Brilho sutil no topo da parede
  ctx.strokeStyle = OFFICE.wallHighlight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 8, oy);
  ctx.lineTo(ox + width - 8, oy);
  ctx.stroke();
}

function drawMeetingRoom(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  // Sala de reunião no canto direito
  const rx = ox + OFFICE.width - 180;
  const ry = oy + 20;
  const rw = 160;
  const rh = 160;

  // Paredes de vidro (transparentes)
  ctx.fillStyle = 'rgba(99, 102, 241, 0.03)';
  ctx.fillRect(rx, ry, rw, rh);

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);

  // Rótulo
  ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.font = '600 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SALA DE REUNIÃO', rx + rw / 2, ry + 14);

  // Mesa de reunião oval
  ctx.fillStyle = '#1a1d35';
  ctx.beginPath();
  ctx.ellipse(rx + rw / 2, ry + rh / 2 + 10, 50, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cadeiras ao redor da mesa
  const chairPositions = [
    [rx + rw / 2 - 55, ry + rh / 2 + 10],
    [rx + rw / 2 + 55, ry + rh / 2 + 10],
    [rx + rw / 2, ry + rh / 2 - 25],
    [rx + rw / 2, ry + rh / 2 + 45],
    [rx + rw / 2 - 40, ry + rh / 2 - 15],
    [rx + rw / 2 + 40, ry + rh / 2 - 15],
  ];
  chairPositions.forEach(([cx, cy]) => {
    ctx.fillStyle = '#22264a';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCEORoom(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  // Sala do CEO / Escritório do fundador
  const rx = ox + 20;
  const ry = oy + 20;
  const rw = 130;
  const rh = 120;

  ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
  ctx.fillRect(rx, ry, rw, rh);

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);

  // Label
  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.font = '600 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CEO — NEW HOLDING', rx + rw / 2, ry + 14);

  // Mesa executiva grande
  ctx.fillStyle = '#1a2535';
  ctx.beginPath();
  ctx.roundRect(rx + 25, ry + 40, 80, 35, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Monitor
  ctx.fillStyle = '#0a1520';
  ctx.fillRect(rx + 50, ry + 42, 30, 20);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.fillRect(rx + 52, ry + 44, 26, 16);

  // Base monitor
  ctx.fillStyle = '#222';
  ctx.fillRect(rx + 62, ry + 62, 6, 4);

  // Cadeira CEO
  ctx.fillStyle = '#1a3030';
  ctx.beginPath();
  ctx.arc(rx + 65, ry + 85, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDesk(ctx: CanvasRenderingContext2D, desk: Desk, time: number) {
  const { x, y } = desk;

  // Mesa
  ctx.fillStyle = '#151830';
  ctx.beginPath();
  ctx.roundRect(x - 30, y - 15, 60, 30, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Monitor
  ctx.fillStyle = '#0a0d1a';
  ctx.fillRect(x - 12, y - 12, 24, 16);

  // Tela do monitor (brilha suavemente)
  const screenGlow = 0.2 + Math.sin(time * 0.5 + desk.x) * 0.1;
  if (desk.occupied) {
    ctx.fillStyle = `rgba(99, 102, 241, ${screenGlow + 0.15})`;
  } else {
    ctx.fillStyle = `rgba(40, 40, 80, ${screenGlow})`;
  }
  ctx.fillRect(x - 10, y - 10, 20, 12);

  // Linhas de "código" na tela se ocupada
  if (desk.occupied) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 3; i++) {
      const lineW = 6 + Math.sin(time * 2 + i + desk.x) * 4;
      ctx.fillRect(x - 8, y - 8 + i * 3, lineW, 1);
    }
  }

  // Base do monitor
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 3, y + 4, 6, 3);

  // Teclado
  ctx.fillStyle = '#18183a';
  ctx.fillRect(x - 10, y + 9, 20, 5);

  // Cadeira (atrás da mesa, se vazio)
  if (!desk.occupied) {
    ctx.fillStyle = '#1c1f3a';
    ctx.beginPath();
    ctx.arc(x, y + 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBreakArea(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const bx = ox + 20;
  const by = oy + OFFICE.height - 130;
  const bw = 130;
  const bh = 110;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.02)';
  ctx.fillRect(bx, by, bw, bh);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.font = '600 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ COPA', bx + bw / 2, by + 14);

  // Mesinha redonda
  ctx.fillStyle = '#1a1a28';
  ctx.beginPath();
  ctx.arc(bx + 45, by + 55, 18, 0, Math.PI * 2);
  ctx.fill();

  // Mesinha 2
  ctx.beginPath();
  ctx.arc(bx + 95, by + 70, 14, 0, Math.PI * 2);
  ctx.fill();

  // Cadeiras
  [[bx+30, by+45], [bx+60, by+45], [bx+30, by+70], [bx+60, by+70]].forEach(([cx, cy]) => {
    ctx.fillStyle = '#22223a';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
  });

  // Máquina de café
  ctx.fillStyle = '#252535';
  ctx.fillRect(bx + bw - 30, by + 25, 15, 22);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.fillRect(bx + bw - 28, by + 28, 11, 8);
}

function drawNewLogo(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  // Logo da empresa na parede (topo do escritório)
  const cx = ox + OFFICE.width / 2;
  const cy = oy + 20;

  // Fundo da placa
  ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
  ctx.beginPath();
  ctx.roundRect(cx - 80, cy - 8, 160, 22, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - 80, cy - 8, 160, 22, 4);
  ctx.stroke();

  // Texto
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N E W   H O L D I N G   L T D A', cx, cy + 3);
}

function drawServerRack(ctx: CanvasRenderingContext2D, ox: number, oy: number, time: number) {
  const sx = ox + OFFICE.width - 180;
  const sy = oy + OFFICE.height - 100;

  ctx.fillStyle = 'rgba(99, 102, 241, 0.02)';
  ctx.fillRect(sx, sy, 160, 80);
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(sx, sy, 160, 80);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.font = '600 8px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ SERVIDORES IA', sx + 80, sy + 12);

  // Racks
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#12152a';
    ctx.fillRect(sx + 15 + i * 48, sy + 22, 36, 50);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 15 + i * 48, sy + 22, 36, 50);

    // Luzes LED piscando nos racks
    for (let j = 0; j < 4; j++) {
      const on = Math.sin(time * 3 + i * 2 + j * 1.7) > 0;
      ctx.fillStyle = on ? 'rgba(99, 102, 241, 0.7)' : 'rgba(99, 102, 241, 0.1)';
      ctx.beginPath();
      ctx.arc(sx + 25 + i * 48, sy + 32 + j * 10, 2, 0, Math.PI * 2);
      ctx.fill();

      const on2 = Math.sin(time * 4 + i * 3 + j * 2.1) > 0;
      ctx.fillStyle = on2 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.08)';
      ctx.beginPath();
      ctx.arc(sx + 32 + i * 48, sy + 32 + j * 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHumanoid(ctx: CanvasRenderingContext2D, agent: Agent, time: number) {
  const { x, y, skinTone, shirtColor, name, type, state, legSwing, armSwing } = agent;

  ctx.save();
  ctx.translate(x, y);

  const breatheOffset = Math.sin(time * 2 + agent.phase) * 1;
  const walkLeg = state === 'walking' ? Math.sin(legSwing) * 6 : 0;
  const walkArm = state === 'walking' ? Math.sin(armSwing) * 5 : Math.sin(time * 0.6 + agent.phase) * 1.5;

  const isSeated = state === 'working';

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, isSeated ? 12 : 28, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isSeated) {
    // === SENTADO ===
    // Pernas dobradas para frente
    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(-8, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, 6); ctx.lineTo(8, 12); ctx.stroke();

    // Sapatos
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-8, 13, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 13, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Tronco
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(-10, -12 + breatheOffset * 0.3);
    ctx.quadraticCurveTo(-11, -2, -8, 8);
    ctx.lineTo(8, 8);
    ctx.quadraticCurveTo(11, -2, 10, -12 + breatheOffset * 0.3);
    ctx.quadraticCurveTo(7, -18, 0, -19 + breatheOffset * 0.4);
    ctx.quadraticCurveTo(-7, -18, -10, -12 + breatheOffset * 0.3);
    ctx.fill();

    // Braços (digitando)
    const typeAnim = Math.sin(time * 8 + agent.phase) * 1.5;
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-14, 0 + typeAnim); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(14, 0 - typeAnim); ctx.stroke();

    // Mãos
    ctx.fillStyle = skinTone;
    ctx.beginPath(); ctx.arc(-14, 1 + typeAnim, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 1 - typeAnim, 3, 0, Math.PI * 2); ctx.fill();

  } else {
    // === EM PÉ / ANDANDO ===
    // Pernas
    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(-5 - walkLeg * 0.4, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, 14); ctx.lineTo(5 + walkLeg * 0.4, 26); ctx.stroke();

    // Sapatos
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-5 - walkLeg * 0.4, 27, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5 + walkLeg * 0.4, 27, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Tronco
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.moveTo(-10, -4 + breatheOffset * 0.3);
    ctx.quadraticCurveTo(-11, 6, -8, 16);
    ctx.lineTo(8, 16);
    ctx.quadraticCurveTo(11, 6, 10, -4 + breatheOffset * 0.3);
    ctx.quadraticCurveTo(7, -10, 0, -11 + breatheOffset * 0.4);
    ctx.quadraticCurveTo(-7, -10, -10, -4 + breatheOffset * 0.3);
    ctx.fill();

    // Braços
    ctx.strokeStyle = shirtColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -1); ctx.lineTo(-14, 13 + walkArm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(14, 13 - walkArm); ctx.stroke();

    // Mãos
    ctx.fillStyle = skinTone;
    ctx.beginPath(); ctx.arc(-14, 14 + walkArm, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 14 - walkArm, 3, 0, Math.PI * 2); ctx.fill();
  }

  // === CABEÇA (comum) ===
  const headY = isSeated ? -26 : -18;

  // Pescoço
  ctx.fillStyle = skinTone;
  ctx.fillRect(-3, headY + 7, 6, 5);

  // Cabeça
  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(0, headY + breatheOffset * 0.3, 10, 0, Math.PI * 2);
  ctx.fill();

  // Cabelo
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(0, headY - 2 + breatheOffset * 0.3, 10, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, headY - 5 + breatheOffset * 0.3, 9, 5, 0, 0, Math.PI);
  ctx.fill();

  // Olhos
  const eyeY = headY + breatheOffset * 0.3;
  const lookX = Math.sin(time * 0.3 + agent.phase) * 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-4, eyeY, 2.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, eyeY, 2.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = type === 'scientist' ? '#6366f1' : '#10b981';
  ctx.beginPath(); ctx.arc(-4 + lookX, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + lookX, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-4 + lookX, eyeY, 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + lookX, eyeY, 0.7, 0, Math.PI * 2); ctx.fill();

  // Óculos para cientistas
  if (type === 'scientist') {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(-4, eyeY, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, eyeY, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, eyeY); ctx.lineTo(0.3, eyeY); ctx.stroke();
  }

  // Boca
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, headY + 5 + breatheOffset * 0.3, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Estado do agente (badge)
  const badgeY = headY - 16 + breatheOffset * 0.3;
  if (state === 'working') {
    ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.font = '600 7px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💻 Trabalhando...', 0, badgeY - 4);
  }

  // Nome
  ctx.font = '600 8px Inter, system-ui, sans-serif';
  const metrics = ctx.measureText(name);
  const labelW = metrics.width + 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.roundRect(-labelW / 2, badgeY - 2, labelW, 14, 3);
  ctx.fill();
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-labelW / 2, badgeY + 10, labelW, 1.5);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 0, badgeY + 5);

  ctx.restore();
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const agentsRef = useRef<Agent[]>([]);
  const desksRef = useRef<Desk[]>([]);
  const sciIdx = useRef(0);
  const personIdx = useRef(0);
  const initialized = useRef(false);

  useEffect(() => { agentsRef.current = agents; }, [agents]);

  const spawnAgent = useCallback((type: 'scientist' | 'person') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Encontrar uma mesa livre
    const freeDeskIdx = desksRef.current.findIndex(d => !d.occupied);
    if (freeDeskIdx === -1) return; // sem mesa livre

    const desk = desksRef.current[freeDeskIdx];
    desk.occupied = true;

    const name = type === 'scientist'
      ? SCIENTIST_NAMES[sciIdx.current++ % SCIENTIST_NAMES.length]
      : PERSON_NAMES[personIdx.current++ % PERSON_NAMES.length];

    // Spawn na entrada (parte de baixo do escritório)
    const ox = (canvas.width - OFFICE.width) / 2;
    const oy = (canvas.height - OFFICE.height) / 2;

    const newAgent: Agent = {
      id: crypto.randomUUID(),
      name,
      type,
      x: ox + OFFICE.width / 2,
      y: oy + OFFICE.height + 20,
      targetX: desk.x,
      targetY: desk.y + 22, // Posição da cadeira (atrás da mesa)
      skinTone: pick(SKIN_TONES),
      shirtColor: type === 'scientist' ? pick(SCI_COLORS) : pick(PERSON_COLORS),
      phase: Math.random() * Math.PI * 2,
      walkTimer: 0,
      state: 'walking',
      legSwing: 0,
      armSwing: 0,
      assignedDesk: freeDeskIdx,
      workProgress: 0,
    };

    desk.agentId = newAgent.id;
    setAgents(prev => [...prev, newAgent]);
  }, []);

  const resetScene = useCallback(() => {
    setAgents([]);
    sciIdx.current = 0;
    personIdx.current = 0;
    desksRef.current.forEach(d => { d.occupied = false; d.agentId = null; });
  }, []);

  // ===== GAME LOOP =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!initialized.current) {
        const ox = (canvas.width - OFFICE.width) / 2;
        const oy = (canvas.height - OFFICE.height) / 2;
        desksRef.current = generateDesks(ox, oy);
        initialized.current = true;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      const time = timestamp / 1000;

      const w = canvas.width;
      const h = canvas.height;
      const ox = (w - OFFICE.width) / 2;
      const oy = (h - OFFICE.height) / 2;

      // Limpar
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      // Background gradient sutil
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      bgGrad.addColorStop(0, 'rgba(99, 102, 241, 0.03)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Escritório
      drawOfficeFloor(ctx, ox, oy);
      drawWalls(ctx, ox, oy);
      drawNewLogo(ctx, ox, oy);
      drawCEORoom(ctx, ox, oy);
      drawMeetingRoom(ctx, ox, oy);
      drawBreakArea(ctx, ox, oy);
      drawServerRack(ctx, ox, oy, time);

      // Mesas
      desksRef.current.forEach(desk => drawDesk(ctx, desk, time));

      // Atualizar agentes
      const currentAgents = agentsRef.current;
      currentAgents.forEach(agent => {
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (agent.state === 'walking' && dist > 3) {
          const speed = 55;
          agent.x += (dx / dist) * speed * dt;
          agent.y += (dy / dist) * speed * dt;
          agent.legSwing += dt * 10;
          agent.armSwing += dt * 10;
        } else if (agent.state === 'walking') {
          // Chegou na mesa
          agent.state = 'working';
          agent.x = agent.targetX;
          agent.y = agent.targetY;
        }
      });

      // Desenhar agentes (ordenados por Y)
      const sorted = [...currentAgents].sort((a, b) => a.y - b.y);
      sorted.forEach(agent => drawHumanoid(ctx, agent, time));

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const scientistCount = agents.filter(a => a.type === 'scientist').length;
  const personCount = agents.filter(a => a.type === 'person').length;
  const totalDesks = 12;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030308]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* HUD HEADER */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center backdrop-blur-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white/90">New Holding Ltda</h1>
            <p className="text-[9px] text-white/25 tracking-[0.12em] uppercase">Escritório Virtual &bull; Agentes Autônomos</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => spawnAgent('scientist')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/70 border border-indigo-500/30 rounded-lg text-[11px] text-indigo-300 uppercase tracking-wider backdrop-blur-xl hover:bg-indigo-900/70 hover:border-indigo-400/50 transition-all">
            <span className="text-indigo-400">+</span> Contratar Cientista
          </button>
          <button onClick={() => spawnAgent('person')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 uppercase tracking-wider backdrop-blur-xl hover:bg-emerald-900/70 hover:border-emerald-400/50 transition-all">
            <span className="text-emerald-400">+</span> Contratar Agente
          </button>
          <button onClick={resetScene} className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/30 backdrop-blur-xl hover:text-white/70 transition-all" title="Demitir Todos">↺</button>
        </div>
      </header>

      {/* STATUS HUD */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2 pointer-events-none">
        <div className="bg-black/60 border border-indigo-500/20 rounded-lg px-3 py-2 backdrop-blur-xl">
          <p className="text-[9px] text-indigo-400/50 uppercase tracking-widest">Cientistas</p>
          <p className="text-lg font-light text-indigo-300">{scientistCount}</p>
        </div>
        <div className="bg-black/60 border border-emerald-500/20 rounded-lg px-3 py-2 backdrop-blur-xl">
          <p className="text-[9px] text-emerald-400/50 uppercase tracking-widest">Agentes</p>
          <p className="text-lg font-light text-emerald-300">{personCount}</p>
        </div>
        <div className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-xl">
          <p className="text-[9px] text-white/30 uppercase tracking-widest">Mesas</p>
          <p className="text-lg font-light text-white/60">{scientistCount + personCount}/{totalDesks}</p>
        </div>
      </div>

      {/* INFO */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 backdrop-blur-xl text-[9px] text-white/20 font-mono">
          <p>Contrate agentes e veja-os trabalhar</p>
          <p>Cada um senta em uma mesa do escritório</p>
        </div>
      </div>
    </div>
  );
}
