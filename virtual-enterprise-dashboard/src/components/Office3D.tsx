'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Sparkles, RoundedBox, MeshReflectorMaterial, useTexture, Environment } from '@react-three/drei';
import { useRef, useState, useMemo, useCallback, Suspense, useEffect } from 'react';
import * as THREE from 'three';
import CharacterCreator, { type CreatorResult } from './CharacterCreator';
import AgentChat from './AgentChat';
import { initStore, getAgents, getAgent, getManager, createAgent, resetAll, type CreateAgentParams } from '@/lib/agentStore';
import type { AgentConfig } from '@/lib/agentTypes';
import { generateUUID } from '@/lib/utils';

/* ==========================================================================
   CONSTANTES
   ========================================================================== */

/* ==========================================================================
   PATHFINDING — Grafo de waypoints com A* simplificado
   Agentes NUNCA atravessam mesas, paredes ou móveis
   ========================================================================== */

// Nós do grafo com adjacência explícita
interface NavNode {
  id: number;
  pos: [number, number, number];
  neighbors: number[]; // IDs dos nós adjacentes
  label?: string;
}

const NAV_NODES: NavNode[] = [
  // Entrada
  { id: 0, pos: [0, 0, 7], neighbors: [1, 2, 3], label: 'Entrada' },
  // Corredor frontal (frente das mesas, Z=5.5)
  { id: 1, pos: [-5, 0, 5.5], neighbors: [0, 2, 5, 17] },
  { id: 2, pos: [-2, 0, 5.5], neighbors: [0, 1, 3, 6] },
  { id: 3, pos: [1, 0, 5.5],  neighbors: [0, 2, 4, 7] },
  { id: 4, pos: [4, 0, 5.5],  neighbors: [3, 8, 19] },
  // Corredor do meio (entre fileiras 1-2, Z=2.5)
  { id: 5, pos: [-5, 0, 2.5], neighbors: [1, 6, 9, 17] },
  { id: 6, pos: [-2, 0, 2.5], neighbors: [2, 5, 7, 10] },
  { id: 7, pos: [1, 0, 2.5],  neighbors: [3, 6, 8, 11] },
  { id: 8, pos: [4, 0, 2.5],  neighbors: [4, 7, 12, 19] },
  // Corredor traseiro (atrás das mesas, Z=-0.5)
  { id: 9,  pos: [-5, 0, -0.5], neighbors: [5, 10, 13, 17] },
  { id: 10, pos: [-2, 0, -0.5], neighbors: [6, 9, 11, 14] },
  { id: 11, pos: [1, 0, -0.5],  neighbors: [7, 10, 12, 15] },
  { id: 12, pos: [4, 0, -0.5],  neighbors: [8, 11, 16, 19] },
  // Corredor fundo (Z=-3)
  { id: 13, pos: [-5, 0, -3], neighbors: [9, 14, 17] },
  { id: 14, pos: [-2, 0, -3], neighbors: [10, 13, 15] },
  { id: 15, pos: [1, 0, -3],  neighbors: [11, 14, 16] },
  { id: 16, pos: [4, 0, -3],  neighbors: [12, 15, 19] },
  // Lateral esquerda
  { id: 17, pos: [-5.5, 0, 0], neighbors: [1, 5, 9, 13, 18], label: 'Lateral E' },
  // Sala NEXUS (canto superior esquerdo)
  { id: 18, pos: [-5, 0, -5], neighbors: [13, 17], label: 'Sala NEXUS' },
  // Lateral direita
  { id: 19, pos: [5.5, 0, 0], neighbors: [4, 8, 12, 16, 20], label: 'Lateral D' },
  // Acesso sala de reunião
  { id: 20, pos: [5.5, 0, -2], neighbors: [19, 21] },
  { id: 21, pos: [7, 0, -2],   neighbors: [20, 22, 23] },
  { id: 22, pos: [8, 0, -1],   neighbors: [21, 23], label: 'Reunião' },
  { id: 23, pos: [9, 0, -2],   neighbors: [21, 22] },
];

// A* simplificado no grafo
function findPath(from: [number, number, number], to: [number, number, number]): [number, number, number][] {
  // Encontrar nó mais próximo ao ponto de origem e destino
  const nearestNode = (p: [number, number, number]) => {
    let best = 0, bestD = Infinity;
    NAV_NODES.forEach(n => {
      const d = Math.hypot(n.pos[0] - p[0], n.pos[2] - p[2]);
      if (d < bestD) { bestD = d; best = n.id; }
    });
    return best;
  };

  const startId = nearestNode(from);
  const endId = nearestNode(to);
  if (startId === endId) return [NAV_NODES[startId].pos, to];

  // A* com heurística euclidiana
  const openSet = new Set([startId]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  NAV_NODES.forEach(n => { gScore.set(n.id, Infinity); fScore.set(n.id, Infinity); });
  gScore.set(startId, 0);
  fScore.set(startId, Math.hypot(NAV_NODES[startId].pos[0] - NAV_NODES[endId].pos[0], NAV_NODES[startId].pos[2] - NAV_NODES[endId].pos[2]));

  while (openSet.size > 0) {
    // Pegar nó com menor fScore
    let current = -1, minF = Infinity;
    openSet.forEach(id => {
      const f = fScore.get(id) || Infinity;
      if (f < minF) { minF = f; current = id; }
    });

    if (current === endId) {
      // Reconstruir caminho
      const path: [number, number, number][] = [to];
      let c = current;
      while (cameFrom.has(c)) {
        path.unshift(NAV_NODES[c].pos);
        c = cameFrom.get(c)!;
      }
      if (c !== startId) path.unshift(NAV_NODES[startId].pos);
      return path;
    }

    openSet.delete(current);
    const node = NAV_NODES[current];

    for (const neighborId of node.neighbors) {
      const neighbor = NAV_NODES[neighborId];
      const tentG = (gScore.get(current) || 0) + Math.hypot(node.pos[0] - neighbor.pos[0], node.pos[2] - neighbor.pos[2]);

      if (tentG < (gScore.get(neighborId) || Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentG);
        fScore.set(neighborId, tentG + Math.hypot(neighbor.pos[0] - NAV_NODES[endId].pos[0], neighbor.pos[2] - NAV_NODES[endId].pos[2]));
        openSet.add(neighborId);
      }
    }
  }

  // Fallback: caminho direto (não deveria acontecer)
  return [NAV_NODES[startId].pos, NAV_NODES[endId].pos, to];
}

/* Posições das mesas */
const DESK_POSITIONS: [number, number, number][] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) DESK_POSITIONS.push([-3 + c * 2.2, 0, -1 + r * 2.5]);

/* Posições das cadeiras de mesa (atrás da mesa) */
const DESK_CHAIR_POS = DESK_POSITIONS.map(([x, y, z]) => [x, y, z + 0.8] as [number, number, number]);

/* POIs */
const POI = {
  desks: DESK_POSITIONS,
  meeting: [8, 0, -2] as [number, number, number],
  entrance: [0, 0, 7] as [number, number, number],
  coffeeSpots: [[10, 0, 1], [9.5, 0, 0.5]] as [number, number, number][],
  puffArea: [[-4.5, 0, 5], [-3.5, 0, 5.5]] as [number, number, number][],
  managerDesk: [-4.5, 0, -5] as [number, number, number],
};

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

/* ==========================================================================
   TIPO DO AGENTE
   ========================================================================== */
interface AgentData {
  id: string; name: string; role: string; roleIcon: string;
  skin: string; hair: string; shirt: string; pants: string;
  deskIdx: number; x: number; y: number; z: number;
  targetX: number; targetY: number; targetZ: number;
  state: 'walking' | 'working' | 'idle' | 'meeting' | 'chatting';
  phase: number; stateTimer: number; rotY: number;
  path: [number, number, number][]; pathIdx: number;
  statusText: string;
  isManager?: boolean;
}

/* ==========================================================================
   COMPONENTES DE DECORAÇÃO
   ========================================================================== */

/* Luminária de teto */
function CeilingLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Estrutura */}
      <mesh><boxGeometry args={[1.2, 0.04, 0.35]} /><meshStandardMaterial color="#1a1d30" metalness={0.6} roughness={0.3} /></mesh>
      {/* Painel LED */}
      <mesh position={[0, -0.025, 0]}><boxGeometry args={[1.1, 0.01, 0.28]} /><meshStandardMaterial color="#e0e7ff" emissive="#c7d2fe" emissiveIntensity={0.8} /></mesh>
      {/* Luz real */}
      <pointLight position={[0, -0.2, 0]} intensity={4.5} color="#e0e7ff" distance={10} decay={2} />
    </group>
  );
}

/* Puff / pufe */
function Puff({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.35, 0.16, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* Planta decorativa */
function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Vaso */}
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.12, 0.15, 0.4, 12]} /><meshStandardMaterial color="#2a2a3a" roughness={0.8} /></mesh>
      {/* Folhas (esferas verdes) */}
      <mesh position={[0, 0.5, 0]} castShadow><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#15803d" roughness={0.9} /></mesh>
      <mesh position={[-0.1, 0.6, 0.05]} castShadow><sphereGeometry args={[0.14, 10, 10]} /><meshStandardMaterial color="#166534" roughness={0.9} /></mesh>
      <mesh position={[0.08, 0.58, -0.06]} castShadow><sphereGeometry args={[0.12, 10, 10]} /><meshStandardMaterial color="#22c55e" roughness={0.9} /></mesh>
    </group>
  );
}

/* Quadro branco / whiteboard */
function Whiteboard({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Moldura */}
      <RoundedBox args={[1.8, 1.2, 0.04]} position={[0, 1.4, 0]} radius={0.02} castShadow>
        <meshStandardMaterial color="#e5e7eb" roughness={0.3} />
      </RoundedBox>
      {/* Área de escrita */}
      <mesh position={[0, 1.4, 0.025]}>
        <planeGeometry args={[1.65, 1.05]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.15} />
      </mesh>
      {/* Bandeja de marcadores */}
      <mesh position={[0, 0.78, 0.05]}>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.5} />
      </mesh>
    </group>
  );
}

/* Tapete */
function AreaRug({ position, size, color }: { position: [number, number, number]; size: [number, number]; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.003, position[2]]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/* ==========================================================================
   MESA DE TRABALHO
   ========================================================================== */
function Desk({ position, occupied }: { position: [number, number, number]; occupied: boolean }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.6, 0.06, 0.9]} position={[0, 0.72, 0]} radius={0.02} castShadow receiveShadow>
        <meshStandardMaterial color="#1a1d35" roughness={0.3} metalness={0.4} />
      </RoundedBox>
      {[[-0.7, 0.36, -0.35], [0.7, 0.36, -0.35], [-0.7, 0.36, 0.35], [0.7, 0.36, 0.35]].map((p, i) => (
        <mesh key={i} position={p as [number,number,number]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.72, 8]} /><meshStandardMaterial color="#2a2f55" metalness={0.6} roughness={0.3} /></mesh>
      ))}
      {/* Monitor */}
      <group position={[0, 1.1, -0.2]}>
        <RoundedBox args={[0.72, 0.46, 0.025]} radius={0.015} castShadow><meshStandardMaterial color="#0a0a15" roughness={0.1} metalness={0.8} /></RoundedBox>
        <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.64, 0.38]} /><meshStandardMaterial color={occupied ? '#1a1a4a' : '#08080f'} emissive={occupied ? '#4f46e5' : '#000'} emissiveIntensity={occupied ? 0.5 : 0} /></mesh>
        <mesh position={[0, -0.28, 0]}><cylinderGeometry args={[0.02, 0.04, 0.12, 8]} /><meshStandardMaterial color="#2a2f55" metalness={0.7} /></mesh>
        <mesh position={[0, -0.34, 0.08]}><cylinderGeometry args={[0.1, 0.1, 0.02, 16]} /><meshStandardMaterial color="#2a2f55" metalness={0.7} /></mesh>
      </group>
      {/* Teclado */}
      <RoundedBox args={[0.4, 0.018, 0.15]} position={[0, 0.755, 0.15]} radius={0.005}><meshStandardMaterial color="#15172a" roughness={0.5} metalness={0.3} /></RoundedBox>
      {/* Mouse */}
      <mesh position={[0.35, 0.75, 0.15]} castShadow><capsuleGeometry args={[0.02, 0.04, 6, 8]} /><meshStandardMaterial color="#1a1a2e" roughness={0.4} /></mesh>
      {/* Caneca */}
      <mesh position={[-0.55, 0.8, 0.1]} castShadow><cylinderGeometry args={[0.04, 0.035, 0.09, 12]} /><meshStandardMaterial color="#3b3b6e" roughness={0.6} /></mesh>
      {!occupied && <Chair position={[0, 0, 0.8]} />}
    </group>
  );
}

function Chair({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.04, 16]} /><meshStandardMaterial color="#1e2045" /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.03, 0.03, 0.4, 8]} /><meshStandardMaterial color="#333" metalness={0.8} /></mesh>
      {[0, 1.25, 2.5, 3.75, 5].map((a, i) => (
        <mesh key={i} position={[Math.cos(a)*0.15, 0.02, Math.sin(a)*0.15]} rotation={[0, a, Math.PI/2]}><cylinderGeometry args={[0.015, 0.015, 0.25, 4]} /><meshStandardMaterial color="#333" metalness={0.8} /></mesh>
      ))}
      <RoundedBox args={[0.35, 0.35, 0.04]} position={[0, 0.64, -0.18]} radius={0.02}><meshStandardMaterial color="#1e2045" /></RoundedBox>
    </group>
  );
}

/* ==========================================================================
   HUMANOIDE 3D MELHORADO
   ========================================================================== */
function Humanoid3D({ agent, onClick }: { agent: AgentData; onClick: (id: string) => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const lArmRef = useRef<THREE.Group>(null!);
  const rArmRef = useRef<THREE.Group>(null!);
  const lLegRef = useRef<THREE.Group>(null!);
  const rLegRef = useRef<THREE.Group>(null!);
  const torsoRef = useRef<THREE.Group>(null!);
  const walkCycle = useRef(0);
  const bobOffset = useRef(0);

  useFrame((_, delta) => {
    const t = performance.now() / 1000 + agent.phase;

    // === PATH FOLLOWING ===
    if (agent.state === 'walking' && agent.path.length > 0) {
      const target = agent.path[agent.pathIdx];
      if (target) {
        const dx = target[0] - agent.x;
        const dz = target[2] - agent.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.2) {
          const speed = 1.6 * delta;
          agent.x += (dx / dist) * speed;
          agent.z += (dz / dist) * speed;
          agent.rotY = Math.atan2(dx, dz);
          walkCycle.current += delta * 8;
          bobOffset.current = Math.sin(walkCycle.current) * 0.03;
        } else {
          agent.pathIdx++;
          if (agent.pathIdx >= agent.path.length) {
            agent.state = 'working';
            agent.statusText = '💻 Trabalhando...';
            agent.path = [];
            agent.pathIdx = 0;
          }
        }
      }
    }

    // === TIMER DE COMPORTAMENTO ===
    agent.stateTimer -= delta;
    if (agent.stateTimer <= 0 && agent.state !== 'chatting') {
      agent.stateTimer = 10 + Math.random() * 20;
      const roll = Math.random();

      let dest: [number, number, number];
      if (roll < 0.45) {
        dest = DESK_CHAIR_POS[agent.deskIdx];
        agent.statusText = '💻 Indo trabalhar...';
      } else if (roll < 0.65) {
        const angle = Math.random() * Math.PI * 2;
        dest = [POI.meeting[0] + Math.cos(angle) * 1.5, 0, POI.meeting[2] + Math.sin(angle) * 1.5];
        agent.statusText = '📋 Indo pra reunião...';
      } else if (roll < 0.8) {
        dest = pick(POI.coffeeSpots);
        agent.statusText = '☕ Pausa pro café...';
      } else {
        dest = pick(POI.puffArea);
        agent.statusText = '😌 Relaxando...';
      }

      agent.path = findPath([agent.x, 0, agent.z], dest);
      agent.pathIdx = 0;
      agent.state = 'walking';
    }

    // === ATUALIZAR POSIÇÃO DO GRUPO ===
    if (groupRef.current) {
      groupRef.current.position.x = agent.x;
      groupRef.current.position.y = bobOffset.current;
      groupRef.current.position.z = agent.z;
      groupRef.current.rotation.y = agent.rotY;
    }

    const isWalking = agent.state === 'walking';
    const isWorking = agent.state === 'working';

    // Respiração
    if (torsoRef.current) {
      torsoRef.current.scale.x = 1 + Math.sin(t * 1.8) * 0.015;
      torsoRef.current.scale.z = 1 + Math.sin(t * 1.8) * 0.015;
    }

    // Cabeça
    if (headRef.current) headRef.current.rotation.y = isWalking ? 0 : Math.sin(t * 0.35) * 0.2;

    // Braços
    if (isWalking) {
      if (lArmRef.current) lArmRef.current.rotation.x = Math.sin(walkCycle.current) * 0.45;
      if (rArmRef.current) rArmRef.current.rotation.x = Math.sin(walkCycle.current + Math.PI) * 0.45;
    } else if (isWorking) {
      if (lArmRef.current) lArmRef.current.rotation.x = -0.7 + Math.sin(t * 7) * 0.06;
      if (rArmRef.current) rArmRef.current.rotation.x = -0.7 + Math.sin(t * 7 + 1) * 0.06;
    } else {
      if (lArmRef.current) lArmRef.current.rotation.x = Math.sin(t * 0.4) * 0.06;
      if (rArmRef.current) rArmRef.current.rotation.x = Math.sin(t * 0.4 + Math.PI) * 0.06;
    }

    // Pernas
    if (isWalking) {
      if (lLegRef.current) lLegRef.current.rotation.x = Math.sin(walkCycle.current + Math.PI) * 0.35;
      if (rLegRef.current) rLegRef.current.rotation.x = Math.sin(walkCycle.current) * 0.35;
    } else {
      if (lLegRef.current) lLegRef.current.rotation.x *= 0.9;
      if (rLegRef.current) rLegRef.current.rotation.x *= 0.9;
    }
  });

  return (
    <group ref={groupRef} position={[agent.x, 0, agent.z]} onClick={(e) => { e.stopPropagation(); onClick(agent.id); }} >
      {/* Sombra de contato */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.25, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.2} />
      </mesh>

      {/* Pernas */}
      <group ref={lLegRef} position={[-0.1, 0.5, 0]}>
        <mesh castShadow position={[0, -0.05, 0]}><capsuleGeometry args={[0.065, 0.38, 8, 12]} /><meshStandardMaterial color={agent.pants} roughness={0.75} /></mesh>
        <mesh position={[0, -0.3, 0.04]} castShadow><boxGeometry args={[0.11, 0.065, 0.17]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
      </group>
      <group ref={rLegRef} position={[0.1, 0.5, 0]}>
        <mesh castShadow position={[0, -0.05, 0]}><capsuleGeometry args={[0.065, 0.38, 8, 12]} /><meshStandardMaterial color={agent.pants} roughness={0.75} /></mesh>
        <mesh position={[0, -0.3, 0.04]} castShadow><boxGeometry args={[0.11, 0.065, 0.17]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
      </group>

      {/* Tronco */}
      <group ref={torsoRef} position={[0, 0.85, 0]}>
        <RoundedBox args={[0.38, 0.45, 0.25]} radius={0.08} castShadow>
          <meshStandardMaterial color={agent.shirt} roughness={0.35} metalness={0.08} />
        </RoundedBox>
        {/* Detalhe da barra da jaqueta/camisa */}
        <RoundedBox args={[0.39, 0.06, 0.26]} position={[0, -0.2, 0]} radius={0.02} castShadow>
          <meshStandardMaterial color={agent.shirt} roughness={0.4} />
        </RoundedBox>
        {/* Cinto */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.37, 0.03, 0.24]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* Colarinho */}
      <mesh position={[0, 1.08, 0.12]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.04]} />
        <meshStandardMaterial color="#fff" roughness={0.5} />
      </mesh>

      {/* Braços */}
      <group ref={lArmRef} position={[-0.25, 0.95, 0]}>
        {/* Manga */}
        <mesh castShadow rotation={[0, 0, 0.2]} position={[-0.03, -0.05, 0]}><capsuleGeometry args={[0.07, 0.15, 12, 12]} /><meshStandardMaterial color={agent.shirt} roughness={0.4} /></mesh>
        {/* Antebraço */}
        <mesh position={[-0.05, -0.18, 0]} rotation={[0, 0, 0.1]} castShadow><cylinderGeometry args={[0.045, 0.035, 0.2, 12]} /><meshStandardMaterial color={agent.skin} roughness={0.55} /></mesh>
        {/* Mão Retinha */}
        <mesh position={[-0.07, -0.33, 0]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.065, 0.1, 0.065]} />
          <meshStandardMaterial color={agent.skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rArmRef} position={[0.25, 0.95, 0]}>
        {/* Manga */}
        <mesh castShadow rotation={[0, 0, -0.2]} position={[0.03, -0.05, 0]}><capsuleGeometry args={[0.07, 0.15, 12, 12]} /><meshStandardMaterial color={agent.shirt} roughness={0.4} /></mesh>
        {/* Antebraço */}
        <mesh position={[0.05, -0.18, 0]} rotation={[0, 0, -0.1]} castShadow><cylinderGeometry args={[0.045, 0.035, 0.2, 12]} /><meshStandardMaterial color={agent.skin} roughness={0.55} /></mesh>
        {/* Mão Retinha */}
        <mesh position={[0.07, -0.33, 0]} rotation={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[0.065, 0.1, 0.065]} />
          <meshStandardMaterial color={agent.skin} roughness={0.6} />
        </mesh>
      </group>

      {/* Pescoço */}
      <mesh position={[0, 1.12, 0]}><cylinderGeometry args={[0.055, 0.065, 0.08, 8]} /><meshStandardMaterial color={agent.skin} /></mesh>

      {/* Cabeça */}
      <group ref={headRef} position={[0, 1.3, 0]}>
        <mesh castShadow><sphereGeometry args={[0.17, 24, 24]} /><meshStandardMaterial color={agent.skin} roughness={0.45} /></mesh>
        {/* Cabelo */}
        <mesh position={[0, 0.065, -0.02]} castShadow><sphereGeometry args={[0.175, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48]} /><meshStandardMaterial color={agent.hair} roughness={0.9} /></mesh>
        {/* Olhos - brancos */}
        <mesh position={[-0.055, 0, 0.148]}><sphereGeometry args={[0.028, 12, 12]} /><meshStandardMaterial color="#f0f0f0" roughness={0.2} /></mesh>
        <mesh position={[0.055, 0, 0.148]}><sphereGeometry args={[0.028, 12, 12]} /><meshStandardMaterial color="#f0f0f0" roughness={0.2} /></mesh>
        {/* Íris */}
        <mesh position={[-0.055, 0, 0.165]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color={agent.shirt} roughness={0.3} /></mesh>
        <mesh position={[0.055, 0, 0.165]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color={agent.shirt} roughness={0.3} /></mesh>
        {/* Pupilas */}
        <mesh position={[-0.055, 0, 0.173]}><sphereGeometry args={[0.008, 6, 6]} /><meshStandardMaterial color="#000" /></mesh>
        <mesh position={[0.055, 0, 0.173]}><sphereGeometry args={[0.008, 6, 6]} /><meshStandardMaterial color="#000" /></mesh>
        {/* Sobrancelhas */}
        <mesh position={[-0.055, 0.045, 0.14]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.05, 0.01, 0.01]} /><meshStandardMaterial color={agent.hair} /></mesh>
        <mesh position={[0.055, 0.045, 0.14]} rotation={[0, 0, -0.1]}><boxGeometry args={[0.05, 0.01, 0.01]} /><meshStandardMaterial color={agent.hair} /></mesh>
        {/* Nariz */}
        <mesh position={[0, -0.02, 0.16]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color={agent.skin} roughness={0.5} /></mesh>
        {/* Boca */}
        <mesh position={[0, -0.055, 0.15]}><capsuleGeometry args={[0.008, 0.03, 4, 6]} /><meshStandardMaterial color="#c0616b" roughness={0.7} /></mesh>
        {/* Orelhas */}
        <mesh position={[-0.16, 0, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={agent.skin} roughness={0.5} /></mesh>
        <mesh position={[0.16, 0, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={agent.skin} roughness={0.5} /></mesh>
        
        {/* Acessórios Exclusivos do Desenvolvedor (Fofo) */}
        {agent.role === 'Desenvolvedor' && (
          <group>
            {/* Headset de Gatinho */}
            <mesh position={[-0.12, 0.18, 0]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color={agent.shirt} roughness={0.3} /></mesh>
            <mesh position={[0.12, 0.18, 0]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color={agent.shirt} roughness={0.3} /></mesh>
            <mesh position={[-0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.03, 16]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.03, 16]} /><meshStandardMaterial color="#111" /></mesh>
            {/* Óculos Geek Redondo */}
            <mesh position={[-0.065, 0, 0.168]}><torusGeometry args={[0.035, 0.007, 8, 24]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
            <mesh position={[0.065, 0, 0.168]}><torusGeometry args={[0.035, 0.007, 8, 24]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
            <mesh position={[0, 0, 0.17]}><boxGeometry args={[0.06, 0.007, 0.004]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
          </group>
        )}
      </group>

      {/* Indicador de clique */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.28, 0.35, 24]} />
        <meshBasicMaterial color={agent.shirt} transparent opacity={agent.state === 'chatting' ? 0.3 : 0.06} />
      </mesh>

      {/* Nome + Status */}
      <Float speed={2} floatIntensity={0.1} rotationIntensity={0}>
        <group position={[0, 1.78, 0]}>
          <mesh><planeGeometry args={[Math.max(agent.name.length, agent.statusText.length) * 0.06 + 0.3, 0.32]} /><meshBasicMaterial color="#000" transparent opacity={0.75} /></mesh>
          <mesh position={[0, -0.15, 0.001]}><planeGeometry args={[Math.max(agent.name.length, agent.statusText.length) * 0.06 + 0.3, 0.02]} /><meshBasicMaterial color={agent.shirt} /></mesh>
          <Text fontSize={0.08} color="#fff" anchorX="center" anchorY="middle" position={[0, 0.04, 0.01]}>{agent.name}</Text>
          <Text fontSize={0.05} color={agent.shirt} anchorX="center" anchorY="middle" position={[0, -0.06, 0.01]}>{agent.statusText}</Text>
        </group>
      </Float>
    </group>
  );
}

/* ==========================================================================
   PORTAL / NOVA SESSÃO
   ========================================================================== */
function PortalDoor() {
  return (
    <group position={[11.5, 0, -2]} onClick={(e) => { e.stopPropagation(); alert('Em breve: Entrando na Área Administrativa (Nova Sessão)'); }}>
      <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[0.2, 3, 1.5]} /><meshStandardMaterial color="#0c0e1e" roughness={0.3} /></mesh>
      <mesh position={[-0.11, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.5, 3]} /><meshBasicMaterial color="#6366f1" transparent opacity={0.6} /></mesh>
      <Text position={[-0.15, 2.7, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.12} color="#fff">MODO ADMIN</Text>
      <mesh position={[-0.11, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[1.3, 2.8]} /><meshStandardMaterial color="#fff" emissive="#6366f1" emissiveIntensity={2} transparent opacity={0.3} /></mesh>
    </group>
  );
}

/* ==========================================================================
   SALA DE REUNIÃO
   ========================================================================== */
function MeetingRoom({ onBellClick }: { onBellClick: () => void }) {
  return (
    <group position={[8, 0, -2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow><planeGeometry args={[6, 5]} /><meshStandardMaterial color="#0e1025" roughness={0.7} /></mesh>
      <mesh position={[-3, 1.5, 0]}><boxGeometry args={[0.05, 3, 5]} /><meshPhysicalMaterial color="#2a3060" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[0, 1.5, -2.5]}><boxGeometry args={[6, 3, 0.05]} /><meshPhysicalMaterial color="#2a3060" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[3, 1.5, 0]}><boxGeometry args={[0.05, 3, 5]} /><meshPhysicalMaterial color="#2a3060" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[-2.97, 2.95, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[5, 0.03, 0.03]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2} /></mesh>
      <Text position={[0, 2.7, -2.4]} fontSize={0.12} color="#f59e0b" anchorX="center" anchorY="middle" letterSpacing={0.2}>SALA DE REUNIÃO</Text>
      <mesh position={[0, 0.72, 0]} castShadow><cylinderGeometry args={[1.4, 1.4, 0.06, 32]} /><meshStandardMaterial color="#1a1d35" roughness={0.2} metalness={0.5} /></mesh>
      <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.15, 0.2, 0.72, 16]} /><meshStandardMaterial color="#2a2f55" metalness={0.7} /></mesh>
      {Array.from({ length: 8 }).map((_, i) => { const a = (i / 8) * Math.PI * 2; return <Chair key={i} position={[Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9]} />; })}
      <group position={[0, 1.8, -2.4]}>
        <RoundedBox args={[2, 1.1, 0.04]} radius={0.02} castShadow><meshStandardMaterial color="#0a0a15" roughness={0.1} metalness={0.8} /></RoundedBox>
        <mesh position={[0, 0, 0.025]}><planeGeometry args={[1.85, 0.95]} /><meshStandardMaterial color="#0d1030" emissive="#4f46e5" emissiveIntensity={0.15} /></mesh>
        <Text position={[0, 0.15, 0.03]} fontSize={0.11} color="#6366f1" anchorX="center" anchorY="middle">Sprint Review</Text>
      </group>
      {/* Sino / Bell na mesa central */}
      <group position={[0, 0.75, 0]} onClick={(e) => { e.stopPropagation(); onBellClick(); }}>
        <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[0.08, 0.15, 0.2, 16]} /><meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.8} /></mesh>
        <mesh position={[0, 0.2, 0]} castShadow><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.8} /></mesh>
        <Float speed={3} floatIntensity={0.2}><Text position={[0, 0.35, 0]} fontSize={0.06} color="#f59e0b" anchorX="center">🔔 REUNIÃO</Text></Float>
      </group>
      <CeilingLight position={[0, 2.9, 0]} />
    </group>
  );
}

/* ==========================================================================
   SALA DO NEXUS — Escritório dourado do Gerente IA
   ========================================================================== */
function ManagerOffice() {
  return (
    <group position={[-4.5, 0, -5]}>
      {/* Piso premium */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[4.5, 3.5]} />
        <meshStandardMaterial color="#0f1020" roughness={0.5} />
      </mesh>
      {/* Tapete dourado */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[3.5, 2.5]} />
        <meshStandardMaterial color="#1a1508" roughness={0.9} />
      </mesh>

      {/* Paredes de vidro */}
      <mesh position={[2.25, 1.5, 0]}><boxGeometry args={[0.05, 3, 3.5]} /><meshPhysicalMaterial color="#2a2520" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[0, 1.5, 1.75]}><boxGeometry args={[4.5, 3, 0.05]} /><meshPhysicalMaterial color="#2a2520" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[-2.25, 1.5, 0]}><boxGeometry args={[0.05, 3, 3.5]} /><meshPhysicalMaterial color="#2a2520" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[0, 1.5, -1.75]}><boxGeometry args={[4.5, 3, 0.05]} /><meshPhysicalMaterial color="#2a2520" transparent opacity={0.12} roughness={0.05} /></mesh>

      {/* Faixa neon dourada no topo */}
      <mesh position={[2.22, 2.95, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3.5, 0.03, 0.03]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0, 2.95, 1.72]}>
        <boxGeometry args={[4.5, 0.03, 0.03]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={3} />
      </mesh>

      {/* Placa */}
      <Text position={[0, 2.65, 1.7]} fontSize={0.13} color="#f59e0b" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        🎯 NEXUS — GERENTE IA
      </Text>

      {/* Mesa executiva grande */}
      <RoundedBox args={[2.2, 0.06, 1.0]} position={[0, 0.72, -0.3]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1a1520" roughness={0.2} metalness={0.5} />
      </RoundedBox>
      {/* Pernas da mesa */}
      {[[-0.9, 0.36, -0.35], [0.9, 0.36, -0.35], [-0.9, 0.36, 0.25], [0.9, 0.36, 0.25]].map((p, i) => (
        <mesh key={i} position={p as [number,number,number]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.72, 8]} /><meshStandardMaterial color="#2a2015" metalness={0.7} /></mesh>
      ))}

      {/* Monitor 1 */}
      <group position={[-0.4, 1.15, -0.5]}>
        <RoundedBox args={[0.72, 0.46, 0.025]} radius={0.015} castShadow><meshStandardMaterial color="#0a0a12" roughness={0.1} metalness={0.8} /></RoundedBox>
        <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.64, 0.38]} /><meshStandardMaterial color="#0d1020" emissive="#f59e0b" emissiveIntensity={0.2} /></mesh>
        <Text position={[0, 0.05, 0.02]} fontSize={0.06} color="#f59e0b" anchorX="center">NEXUS OS</Text>
        <Text position={[0, -0.06, 0.02]} fontSize={0.035} color="#f59e0b" anchorX="center" fillOpacity={0.5}>Sistema de Gestão IA</Text>
      </group>

      {/* Monitor 2 */}
      <group position={[0.4, 1.15, -0.5]}>
        <RoundedBox args={[0.72, 0.46, 0.025]} radius={0.015} castShadow><meshStandardMaterial color="#0a0a12" roughness={0.1} metalness={0.8} /></RoundedBox>
        <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.64, 0.38]} /><meshStandardMaterial color="#0d1020" emissive="#10b981" emissiveIntensity={0.15} /></mesh>
        <Text position={[0, 0.05, 0.02]} fontSize={0.06} color="#10b981" anchorX="center">TEAM BOARD</Text>
        <Text position={[0, -0.06, 0.02]} fontSize={0.035} color="#10b981" anchorX="center" fillOpacity={0.5}>Painel da Equipe</Text>
      </group>

      {/* Cadeira executiva */}
      <Chair position={[0, 0, 0.5]} />

      {/* Luz dourada */}
      <pointLight position={[0, 2.5, 0]} intensity={3} color="#f59e0b" distance={6} decay={2} />
      <CeilingLight position={[0, 2.9, 0]} />

      {/* Planta decorativa */}
      <mesh position={[-1.8, 0.2, -1.2]} castShadow><cylinderGeometry args={[0.12, 0.15, 0.4, 12]} /><meshStandardMaterial color="#2a2a1a" roughness={0.8} /></mesh>
      <mesh position={[-1.8, 0.5, -1.2]} castShadow><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#15803d" roughness={0.9} /></mesh>
    </group>
  );
}

function ServerRack({ position }: { position: [number,number,number] }) {
  const ledsRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => { if (!ledsRef.current) return; const t = clock.getElapsedTime(); ledsRef.current.children.forEach((l, i) => { (l as any).material.emissiveIntensity = Math.sin(t * 3 + i * 1.5) > 0 ? 2 : 0.1; }); });
  return (
    <group position={position}>
      <RoundedBox args={[0.6, 1.8, 0.5]} position={[0, 0.9, 0]} radius={0.02} castShadow><meshStandardMaterial color="#0c0e1e" roughness={0.3} metalness={0.7} /></RoundedBox>
      <group ref={ledsRef}>
        {Array.from({ length: 6 }).map((_, i) => (<mesh key={i} position={[-0.15, 0.3+i*0.22, 0.26]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1} /></mesh>))}
        {Array.from({ length: 6 }).map((_, i) => (<mesh key={`g${i}`} position={[-0.05, 0.3+i*0.22, 0.26]}><sphereGeometry args={[0.015, 8, 8]} /><meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1} /></mesh>))}
      </group>
    </group>
  );
}

function WallLogo() {
  let tex: THREE.Texture | null = null;
  try { tex = useTexture('/logo.png'); } catch { tex = null; }
  return (
    <group position={[0, 2, -5.9]}>
      <mesh><planeGeometry args={[6, 2.5]} /><meshStandardMaterial color="#0a0c20" roughness={0.2} metalness={0.6} /></mesh>
      {tex ? (<mesh position={[0, 0.15, 0.02]}><planeGeometry args={[4, 1.6]} /><meshStandardMaterial map={tex} transparent emissive="#7c3aed" emissiveIntensity={0.3} roughness={0.2} /></mesh>)
        : (<Text position={[0, 0.15, 0.02]} fontSize={0.7} color="#7c3aed" anchorX="center" anchorY="middle" letterSpacing={0.15}>NEW</Text>)}
      <Text position={[0, -0.85, 0.02]} fontSize={0.1} color="#fff" anchorX="center" anchorY="middle" letterSpacing={0.25}>{'H O L D I N G   L T D A'}</Text>
      <spotLight position={[0, 2, 2]} angle={0.4} penumbra={0.5} intensity={3} color="#7c3aed" />
    </group>
  );
}

/* ==========================================================================
   CENA COMPLETA
   ========================================================================== */
function OfficeScene({ agents, onAgentClick, onBellClick }: { agents: AgentData[]; onAgentClick: (id: string) => void; onBellClick: () => void }) {
  const occupiedDesks = useMemo(() => new Set(agents.filter(a => a.state === 'working').map(a => a.deskIdx)), [agents]);
  return (
    <>
      <color attach="background" args={['#060610']} />
      <fog attach="fog" args={['#060610', 16, 40]} />

      {/* Iluminação principal */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 14, 6]} intensity={2.5} color="#a78bfa" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-far={35} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <directionalLight position={[-6, 8, -4]} intensity={1.5} color="#10b981" />

      {/* Luminárias de teto */}
      <CeilingLight position={[-2, 2.9, 0]} />
      <CeilingLight position={[2, 2.9, 0]} />
      <CeilingLight position={[-2, 2.9, 2.5]} />
      <CeilingLight position={[2, 2.9, 2.5]} />
      <CeilingLight position={[-2, 2.9, 5]} />
      <CeilingLight position={[2, 2.9, 5]} />

      {/* Chão refletivo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0, 0.5]} receiveShadow>
        <planeGeometry args={[26, 18]} />
        <MeshReflectorMaterial color="#0c0e1a" blur={[300, 100]} resolution={512} mixBlur={0.8} mixStrength={0.2} roughness={0.85} depthScale={0.5} minDepthThreshold={0.4} maxDepthThreshold={1.2} metalness={0.5} mirror={0.2} />
      </mesh>

      {/* Paredes */}
      <mesh position={[0, 1.5, -6]}><boxGeometry args={[12, 3, 0.08]} /><meshStandardMaterial color="#0f1228" roughness={0.4} metalness={0.3} /></mesh>
      <mesh position={[-6, 1.5, 0.5]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[13, 3, 0.08]} /><meshPhysicalMaterial color="#1a1d40" transparent opacity={0.12} roughness={0.05} /></mesh>
      <mesh position={[0, 2.95, -5.95]}><boxGeometry args={[12, 0.03, 0.03]} /><meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} /></mesh>
      <mesh position={[-5.96, 2.95, 0.5]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[13, 0.03, 0.03]} /><meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} /></mesh>

      {/* Tapetes */}
      <AreaRug position={[-4, 0, 5.2]} size={[3, 2.5]} color="#12152a" />
      <AreaRug position={[0, 0, 5.5]} size={[2, 1.5]} color="#151825" />

      <Suspense fallback={null}><WallLogo /></Suspense>
      <gridHelper args={[26, 52, '#1a1a3a', '#0d0d20']} position={[3, 0.002, 0.5]} />

      {/* Mesas */}
      {DESK_POSITIONS.map((pos, i) => <Desk key={i} position={pos} occupied={occupiedDesks.has(i)} />)}

      {/* Decoração */}
      <Puff position={[-4.8, 0, 4.5]} color="#4338ca" />
      <Puff position={[-3.8, 0, 5.2]} color="#6d28d9" />
      <Puff position={[-4.3, 0, 5.8]} color="#7c3aed" />
      <Plant position={[-5.5, 0, -5]} />
      <Plant position={[5.3, 0, -5]} />
      <Plant position={[-5.5, 0, 6.5]} />
      <Plant position={[5.3, 0, 6.5]} />
      <Whiteboard position={[-5.9, 0, 2.5]} rotation={[0, Math.PI / 2, 0]} />

      {/* Salas */}
      <MeetingRoom onBellClick={onBellClick} />
      <PortalDoor />
      <ManagerOffice />
      <ServerRack position={[5, 0, -4.5]} />
      <ServerRack position={[4.3, 0, -4.5]} />
      <ServerRack position={[3.6, 0, -4.5]} />

      <Sparkles count={60} scale={[22, 5, 14]} size={1} speed={0.2} opacity={0.2} color="#6366f1" />
      <Sparkles count={30} scale={[16, 3, 10]} size={1.2} speed={0.3} opacity={0.12} color="#10b981" />

      {/* Agentes */}
      {agents.map(a => <Humanoid3D key={a.id} agent={a} onClick={onAgentClick} />)}

      <OrbitControls makeDefault minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.2} minDistance={3} maxDistance={22} target={[1, 1, 1]} enableDamping dampingFactor={0.05} />
    </>
  );
}

/* ==========================================================================
   EXPORT PRINCIPAL — Integrado com agentStore real
   ========================================================================== */
export default function Office3D() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showMeetingUI, setShowMeetingUI] = useState(false);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const deskCounter = useRef(0);

  const handleGatherForTask = useCallback((taskName: string) => {
    setAgents(prev => prev.map(a => {
      // Ignorar o Gerente
      if (a.isManager) return a;
      return {
        ...a,
        state: 'meeting' as const,
        stateTimer: 45,
        targetX: 8 + (Math.random() * 2 - 1),
        targetZ: -2 + (Math.random() * 2 - 1),
        statusText: `🏃 Reunião: ${taskName}`,
        path: [], // limpa o path para forçar o recalculo ou ir direto na próxima tick
      };
    }));
    setShowMeetingUI(false);
  }, []);

  // Inicializar store (cria NEXUS + equipe padrão se não existe)
  useEffect(() => {
    initStore();
    const allStoreAgents = getAgents();
    const initial3D: AgentData[] = [];
    let deskI = 0;

    for (const sa of allStoreAgents) {
      if (sa.isManager) {
        // NEXUS → sala do gerente
        const managerDesk = POI.managerDesk;
        initial3D.push({
          name: sa.name,
          role: sa.role,
          roleIcon: sa.roleIcon,
          skin: sa.skin,
          hair: sa.hair,
          shirt: sa.shirt,
          pants: sa.pants,
          id: sa.id,
          deskIdx: -1,
          x: managerDesk[0], y: 0, z: managerDesk[2],
          targetX: managerDesk[0], targetY: 0, targetZ: managerDesk[2],
          state: 'working',
          stateTimer: 999,
          rotY: Math.PI,
          path: [],
          pathIdx: 0,
          statusText: '🎯 Gerenciando...',
          isManager: true,
          phase: 0,
        });
      } else {
        // Funcionários → mesas
        const deskIdx = deskI % DESK_POSITIONS.length;
        const desk = DESK_CHAIR_POS[deskIdx];
        deskI++;
        initial3D.push({
          name: sa.name,
          role: sa.role,
          roleIcon: sa.roleIcon,
          skin: sa.skin,
          hair: sa.hair,
          shirt: sa.shirt,
          pants: sa.pants,
          id: sa.id,
          deskIdx,
          x: desk[0], y: 0, z: desk[2],
          targetX: desk[0], targetY: 0, targetZ: desk[2],
          state: 'working',
          stateTimer: 8 + Math.random() * 15,
          rotY: Math.PI,
          path: [],
          pathIdx: 0,
          statusText: '💻 Trabalhando...',
          isManager: false,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    deskCounter.current = deskI;
    setAgents(initial3D);
  }, []);

  const handleCreate = useCallback((data: CreatorResult) => {
    const deskIdx = deskCounter.current % DESK_POSITIONS.length;
    const desk = DESK_CHAIR_POS[deskIdx];
    deskCounter.current++;

    const startPos: [number, number, number] = [POI.entrance[0], 0, POI.entrance[2]];
    const path = findPath(startPos, desk);

    // Salvar no store real também
    createAgent({
      name: data.name,
      role: data.role as any,
      roleIcon: data.roleIcon,
      task: '',
      runtime: 'subagent',
      mode: 'session',
      model: 'gemini',
      cwd: '/',
      systemPrompt: '',
      temperature: 0.7,
      skills: [],
      skin: data.skin,
      hair: data.hair,
      shirt: data.shirt,
      pants: data.pants,
    });

    const newAgent: AgentData = {
      ...data, id: generateUUID(), deskIdx,
      x: startPos[0], y: 0, z: startPos[2],
      targetX: desk[0], targetY: 0, targetZ: desk[2],
      state: 'walking', stateTimer: 12 + Math.random() * 10, rotY: 0,
      path, pathIdx: 0, statusText: '🚶 Chegando...',
    };
    setAgents(prev => [...prev, newAgent]);
  }, []);

  const handleAgentClick = useCallback((id: string) => {
    setChatAgent(prev => prev === id ? null : id);
    setAgents(prev => prev.map(a => a.id === id ? { ...a, state: 'chatting' as const, stateTimer: 999, statusText: '💬 Conversando...' } : a));
  }, []);

  const closeChat = useCallback(() => {
    if (chatAgent) {
      setAgents(prev => prev.map(a => a.id === chatAgent ? { ...a, state: 'idle' as const, stateTimer: 3, statusText: '😊 Até logo!' } : a));
    }
    setChatAgent(null);
  }, [chatAgent]);

  const reset = useCallback(() => {
    resetAll();
    initStore();
    setChatAgent(null);

    // Recriar todos os agentes na cena
    const allStoreAgents = getAgents();
    const rebuilt: AgentData[] = [];
    let di = 0;

    for (const sa of allStoreAgents) {
      if (sa.isManager) {
        const md = POI.managerDesk;
        rebuilt.push({
          name: sa.name, role: sa.role, roleIcon: sa.roleIcon,
          skin: sa.skin, hair: sa.hair, shirt: sa.shirt, pants: sa.pants,
          id: sa.id, deskIdx: -1,
          x: md[0], y: 0, z: md[2],
          targetX: md[0], targetY: 0, targetZ: md[2],
          state: 'working', stateTimer: 999, rotY: Math.PI,
          path: [], pathIdx: 0, statusText: '🎯 Gerenciando...', isManager: true, phase: 0,
        });
      } else {
        const dIdx = di % DESK_POSITIONS.length;
        const dk = DESK_CHAIR_POS[dIdx];
        di++;
        rebuilt.push({
          name: sa.name, role: sa.role, roleIcon: sa.roleIcon,
          skin: sa.skin, hair: sa.hair, shirt: sa.shirt, pants: sa.pants,
          id: sa.id, deskIdx: dIdx,
          x: dk[0], y: 0, z: dk[2],
          targetX: dk[0], targetY: 0, targetZ: dk[2],
          state: 'working', stateTimer: 8 + Math.random() * 15, rotY: Math.PI,
          path: [], pathIdx: 0, statusText: '💻 Trabalhando...',
          isManager: false, phase: Math.random() * Math.PI * 2,
        });
      }
    }
    deskCounter.current = di;
    setAgents(rebuilt);
  }, []);

  // Buscar agente completo da store pra o chat
  const activeStoreAgent = chatAgent ? getAgent(chatAgent) : null;
  // Fallback: buscar agent visual pra botões
  const activeVisualAgent = agents.find(a => a.id === chatAgent);

  const activeTasksMock = ['Refatorar API', 'Planejar Vendas', 'Design System'];

  return (
    <div className="relative w-full h-full">
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-9 h-9 bg-indigo-600/15 border border-indigo-500/25 rounded-xl flex items-center justify-center backdrop-blur-2xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.25em] uppercase text-white/80">New Holding Ltda</h1>
            <p className="text-[8px] text-white/20 tracking-[0.15em] uppercase">Escritório 3D &bull; Agentes IA Reais</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => setShowCreator(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600/40 to-violet-600/40 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-200 uppercase tracking-wider backdrop-blur-2xl hover:from-indigo-600/60 hover:to-violet-600/60 transition-all duration-300 shadow-lg shadow-indigo-500/10">
            👤 Contratar Agente
          </button>
          <button onClick={reset} className="px-2 py-2 bg-white/5 border border-white/8 rounded-xl text-[10px] text-white/25 backdrop-blur-2xl hover:text-white/60 transition-all" title="Reset">↺</button>
        </div>
      </header>

      {/* Menu de Reunião */}
      {showMeetingUI && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMeetingUI(false)}>
          <div className="w-[380px] bg-indigo-950/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-1">Convocar Reunião</h3>
            <p className="text-[10px] text-white/40 mb-4">Selecione uma tarefa para reunir a equipe</p>
            <div className="space-y-2 mb-4">
              {activeTasksMock.map(task => (
                <button key={task} onClick={() => handleGatherForTask(task)} className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 transition text-xs text-indigo-50 flex items-center justify-between group">
                  <span>{task}</span>
                  <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Convocar →</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMeetingUI(false)} className="w-full py-2 text-[10px] text-white/30 hover:text-white/60">Cancelar</button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 flex gap-2 pointer-events-none">
        <div className="bg-black/50 border border-amber-500/20 rounded-xl px-3 py-2 backdrop-blur-2xl">
          <p className="text-[8px] text-amber-400/50 uppercase tracking-[0.2em]">Gerente</p>
          <p className="text-sm font-light text-amber-300">🎯 NEXUS</p>
        </div>
        <div className="bg-black/50 border border-indigo-500/15 rounded-xl px-3 py-2 backdrop-blur-2xl">
          <p className="text-[8px] text-white/30 uppercase tracking-[0.2em]">Equipe</p>
          <p className="text-lg font-extralight text-indigo-300">{agents.length}</p>
        </div>
        <div className="bg-black/50 border border-white/8 rounded-xl px-3 py-2 backdrop-blur-2xl">
          <p className="text-[8px] text-white/25 uppercase tracking-[0.2em]">Mesas</p>
          <p className="text-lg font-extralight text-white/50">{Math.max(0, agents.length - 1)}/12</p>
        </div>
      </div>

      {!chatAgent && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
          <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 backdrop-blur-2xl text-[8px] text-white/15 font-mono space-y-0.5">
            <p>🖱 Arraste p/ orbitar</p>
            <p>🎯 Clique no NEXUS p/ dar ordens</p>
            <p>👤 Clique num agente p/ conversar</p>
          </div>
        </div>
      )}

      <Canvas shadows dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <OfficeScene agents={agents} onAgentClick={handleAgentClick} onBellClick={() => setShowMeetingUI(true)} />
        </Suspense>
      </Canvas>

      {showCreator && <CharacterCreator onClose={() => setShowCreator(false)} onCreate={handleCreate} />}
      {activeStoreAgent && <AgentChat agent={activeStoreAgent} onClose={closeChat} />}
    </div>
  );
}
