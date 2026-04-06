'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Text, Float, Sparkles } from '@react-three/drei';
import { useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Brain, Plus, FlaskConical, User2, Zap, RotateCcw } from 'lucide-react';

/* ============================================================
   PALETA DE CORES E NOMES
   ============================================================ */
const SCIENTIST_NAMES = ['Dr. Pavlov', 'Dra. Curie', 'Dr. Turing', 'Dra. Rosalind', 'Dr. Feynman', 'Dra. Hypatia', 'Dr. Tesla', 'Dra. Lovelace'];
const PERSON_NAMES = ['Alpha-01', 'Beta-02', 'Gamma-03', 'Delta-04', 'Epsilon-05', 'Zeta-06', 'Eta-07', 'Theta-08'];
const SKIN_TONES = ['#D4A574', '#C68B59', '#8D5524', '#F1C27D', '#E0AC69', '#FFDBAC'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ============================================================
   COMPONENTE: Humanoide com Animação de Respiração e Idle
   ============================================================ */
function Humanoid({
  position,
  name,
  agentColor,
  skinTone,
}: {
  position: [number, number, number];
  name: string;
  agentColor: string;
  skinTone: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Mesh>(null!);
  const torsoRef = useRef<THREE.Mesh>(null!);
  const leftArmRef = useRef<THREE.Mesh>(null!);
  const rightArmRef = useRef<THREE.Mesh>(null!);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phase;

    // Respiração sutil no tronco
    if (torsoRef.current) {
      torsoRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.03;
      torsoRef.current.scale.z = 1 + Math.sin(t * 1.5) * 0.03;
    }

    // Cabeça olha suavemente ao redor
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.3;
      headRef.current.position.y = 1.85 + Math.sin(t * 1.5) * 0.015;
    }

    // Braços balançam suavemente
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t * 0.8) * 0.1;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = Math.sin(t * 0.8 + Math.PI) * 0.1;
    }

    // Corpo inteiro faz um leve bob
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Cabeça */}
      <mesh ref={headRef} position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Olhos */}
      <mesh position={[-0.08, 1.88, 0.18]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.08, 1.88, 0.18]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Cabelo */}
      <mesh position={[0, 1.98, -0.04]} castShadow>
        <sphereGeometry args={[0.23, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>

      {/* Pescoço */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.15, 12]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>

      {/* Tronco (Camisa) */}
      <mesh ref={torsoRef} position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
        <meshStandardMaterial color={agentColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Ombros */}
      <mesh position={[-0.32, 1.38, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={agentColor} roughness={0.4} />
      </mesh>
      <mesh position={[0.32, 1.38, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={agentColor} roughness={0.4} />
      </mesh>

      {/* Braço Esquerdo */}
      <mesh ref={leftArmRef} position={[-0.38, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.55, 8, 16]} />
        <meshStandardMaterial color={agentColor} roughness={0.4} />
      </mesh>
      {/* Mão Esquerda */}
      <mesh position={[-0.38, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>

      {/* Braço Direito */}
      <mesh ref={rightArmRef} position={[0.38, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.55, 8, 16]} />
        <meshStandardMaterial color={agentColor} roughness={0.4} />
      </mesh>
      {/* Mão Direita */}
      <mesh position={[0.38, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color={skinTone} roughness={0.6} />
      </mesh>

      {/* Quadril / Calça */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.2, 8, 16]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.8} />
      </mesh>

      {/* Perna Esquerda */}
      <mesh position={[-0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.8} />
      </mesh>

      {/* Perna Direita */}
      <mesh position={[0.12, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.8} />
      </mesh>

      {/* Sapatos */}
      <mesh position={[-0.12, 0.04, 0.04]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      <mesh position={[0.12, 0.04, 0.04]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.22]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>

      {/* Etiqueta de Nome flutuante */}
      <Float speed={2} floatIntensity={0.2} rotationIntensity={0}>
        <group position={[0, 2.4, 0]}>
          {/* Fundo da etiqueta */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[name.length * 0.12 + 0.3, 0.28]} />
            <meshBasicMaterial color="black" transparent opacity={0.7} />
          </mesh>
          {/* Borda colorida inferior */}
          <mesh position={[0, -0.13, -0.005]}>
            <planeGeometry args={[name.length * 0.12 + 0.3, 0.03]} />
            <meshBasicMaterial color={agentColor} />
          </mesh>
          <Text
            fontSize={0.14}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="/fonts/Inter-Bold.woff"
          >
            {name}
          </Text>
        </group>
      </Float>

      {/* Aura de energia no chão sob o humanoide */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial color={agentColor} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/* ============================================================
   COMPONENTE: Prédio / Estrutura no Cenário
   ============================================================ */
function LabBuilding({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Plataforma base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3, 0.1, 32]} />
        <meshStandardMaterial color="#12122a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Anel de luz */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3, 64]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.4} />
      </mesh>
      {/* Pilares holográficos */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 2.5, 1.5, Math.sin(angle) * 2.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3, 8]} />
          <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.5} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Teto translúcido */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[2.8, 2.8, 0.05, 32]} />
        <meshStandardMaterial color="#4f46e5" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

/* ============================================================
   COMPONENTE: Partículas Flutuantes de Dados
   ============================================================ */
function DataParticles() {
  return (
    <>
      <Sparkles count={80} scale={[20, 8, 20]} size={1.5} speed={0.3} opacity={0.4} color="#6366f1" />
      <Sparkles count={40} scale={[15, 5, 15]} size={2} speed={0.5} opacity={0.3} color="#10b981" />
    </>
  );
}

/* ============================================================
   COMPONENTE: Cena 3D Completa
   ============================================================ */
function LabScene({ agents }: { agents: AgentData[] }) {
  return (
    <>
      <color attach="background" args={['#030308']} />

      {/* Neblina atmosférica */}
      <fog attach="fog" args={['#030308', 8, 30]} />

      {/* Iluminação Cinematográfica */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 12, 5]} intensity={3} color="#948bff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-6, 8, -4]} intensity={2} color="#34d399" />
      <pointLight position={[0, 6, 0]} intensity={6} color="#fff" distance={20} decay={2} />
      <pointLight position={[5, 2, 5]} intensity={2.5} color="#818cf8" distance={12} />
      <pointLight position={[-5, 2, -5]} intensity={2.5} color="#34d399" distance={12} />

      {/* Grid do Chão */}
      <Grid
        renderOrder={-1}
        position={[0, -0.01, 0]}
        infiniteGrid
        fadeDistance={25}
        fadeStrength={5}
        cellSize={0.5}
        sectionSize={3}
        sectionColor="#4f46e5"
        cellColor="#1a1a3e"
        cellThickness={0.6}
      />

      {/* Sombras no chão */}
      <ContactShadows position={[0, 0.01, 0]} scale={30} blur={2.5} far={5} opacity={0.4} />

      {/* Estrutura central do laboratório */}
      <LabBuilding position={[0, 0, 0]} />

      {/* Partículas de Dados */}
      <DataParticles />

      {/* Renderiza os Humanoides */}
      {agents.map((agent) => (
        <Humanoid
          key={agent.id}
          position={agent.position}
          name={agent.name}
          agentColor={agent.agentColor}
          skinTone={agent.skinTone}
        />
      ))}

      {/* Câmera */}
      <OrbitControls
        makeDefault
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={20}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

/* ============================================================
   TIPOS
   ============================================================ */
type AgentData = {
  id: string;
  name: string;
  type: 'scientist' | 'person';
  position: [number, number, number];
  agentColor: string;
  skinTone: string;
};

/* ============================================================
   COMPONENTE PRINCIPAL: WorldView exportado para dynamic import
   ============================================================ */
export default function WorldView() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const sciIndexRef = useRef(0);
  const personIndexRef = useRef(0);

  const spawnAgent = useCallback((type: 'scientist' | 'person') => {
    // Posicionamento em espiral ao redor do centro
    const count = agents.filter(a => a.type === type).length;
    const angle = count * (Math.PI / 3) + (type === 'scientist' ? 0 : Math.PI / 6);
    const radius = 1.2 + count * 0.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const name = type === 'scientist'
      ? SCIENTIST_NAMES[sciIndexRef.current++ % SCIENTIST_NAMES.length]
      : PERSON_NAMES[personIndexRef.current++ % PERSON_NAMES.length];

    const newAgent: AgentData = {
      id: crypto.randomUUID(),
      name,
      type,
      position: [x, 0, z],
      agentColor: type === 'scientist' ? '#6366f1' : '#10b981',
      skinTone: pickRandom(SKIN_TONES),
    };

    setAgents(prev => [...prev, newAgent]);
  }, [agents]);

  const resetScene = useCallback(() => {
    setAgents([]);
    sciIndexRef.current = 0;
    personIndexRef.current = 0;
  }, []);

  const scientistCount = agents.filter(a => a.type === 'scientist').length;
  const personCount = agents.filter(a => a.type === 'person').length;

  return (
    <div className="relative w-full h-full">
      {/* ====== HEADER HUD ====== */}
      <header className="absolute top-0 left-0 right-0 z-20 p-5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 rounded-lg flex items-center justify-center backdrop-blur-xl pointer-events-auto">
            <Brain className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-[0.2em] uppercase text-white/90">New Holding</h1>
            <p className="text-[10px] text-white/30 tracking-[0.15em] uppercase">Empresa Virtual &mdash; Laboratório de Agentes</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => spawnAgent('scientist')}
            className="group flex items-center gap-2 px-4 py-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 uppercase tracking-wider backdrop-blur-xl hover:bg-indigo-900/60 hover:border-indigo-400/60 transition-all duration-300"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
            Cientista
          </button>
          <button
            onClick={() => spawnAgent('person')}
            className="group flex items-center gap-2 px-4 py-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 uppercase tracking-wider backdrop-blur-xl hover:bg-emerald-900/60 hover:border-emerald-400/60 transition-all duration-300"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
            Pessoa Virtual
          </button>
          <button
            onClick={resetScene}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 backdrop-blur-xl hover:text-white/80 hover:border-white/30 transition-all duration-300"
            title="Resetar Cena"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      {/* ====== STATUS HUD - Canto Inferior Esquerdo ====== */}
      <div className="absolute bottom-5 left-5 z-20 pointer-events-none flex gap-3">
        <div className="bg-black/50 border border-indigo-500/20 rounded-lg px-4 py-3 backdrop-blur-xl flex items-center gap-3">
          <FlaskConical size={16} className="text-indigo-400" />
          <div>
            <p className="text-[10px] text-indigo-400/60 uppercase tracking-widest">Cientistas</p>
            <p className="text-xl font-light text-indigo-300">{scientistCount}</p>
          </div>
        </div>
        <div className="bg-black/50 border border-emerald-500/20 rounded-lg px-4 py-3 backdrop-blur-xl flex items-center gap-3">
          <User2 size={16} className="text-emerald-400" />
          <div>
            <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest">Pessoas</p>
            <p className="text-xl font-light text-emerald-300">{personCount}</p>
          </div>
        </div>
      </div>

      {/* ====== DICA HUD - Canto Inferior Direito ====== */}
      <div className="absolute bottom-5 right-5 z-20 pointer-events-none">
        <div className="bg-black/40 border border-white/5 rounded-lg px-4 py-3 backdrop-blur-xl text-[10px] text-white/25 font-mono space-y-1">
          <p className="flex items-center gap-2"><Zap size={10} className="text-yellow-500/50" /> Arraste para orbitar</p>
          <p className="flex items-center gap-2"><Zap size={10} className="text-yellow-500/50" /> Scroll para zoom</p>
          <p className="flex items-center gap-2"><Zap size={10} className="text-yellow-500/50" /> Botão direito para pan</p>
        </div>
      </div>

      {/* ====== CANVAS 3D ====== */}
      <Canvas
        shadows
        camera={{ position: [4, 4, 8], fov: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <LabScene agents={agents} />
      </Canvas>
    </div>
  );
}
