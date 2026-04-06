'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, RoundedBox } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

/* ==========================================================================
   OPÇÕES DE CUSTOMIZAÇÃO
   ========================================================================== */
export const SKIN_OPTIONS = [
  { id: 'light', color: '#FFDBAC', label: 'Clara' },
  { id: 'medium', color: '#F1C27D', label: 'Média' },
  { id: 'tan', color: '#D4A574', label: 'Morena' },
  { id: 'brown', color: '#C68B59', label: 'Castanha' },
  { id: 'dark', color: '#8D5524', label: 'Escura' },
  { id: 'deep', color: '#6B3A1F', label: 'Retinta' },
];

export const HAIR_OPTIONS = [
  { id: 'black', color: '#1a1a2e', label: 'Preto' },
  { id: 'brown', color: '#3d2314', label: 'Castanho' },
  { id: 'blonde', color: '#c9a84c', label: 'Loiro' },
  { id: 'red', color: '#8b2500', label: 'Ruivo' },
  { id: 'blue', color: '#3b5998', label: 'Azul' },
  { id: 'purple', color: '#6b21a8', label: 'Roxo' },
  { id: 'silver', color: '#9ca3af', label: 'Prata' },
  { id: 'green', color: '#15803d', label: 'Verde' },
];

export const SHIRT_OPTIONS = [
  { id: 'indigo', color: '#6366f1', label: 'Indigo' },
  { id: 'emerald', color: '#10b981', label: 'Esmeralda' },
  { id: 'violet', color: '#7c3aed', label: 'Violeta' },
  { id: 'cyan', color: '#06b6d4', label: 'Ciano' },
  { id: 'rose', color: '#e11d48', label: 'Rosa' },
  { id: 'amber', color: '#f59e0b', label: 'Âmbar' },
  { id: 'slate', color: '#475569', label: 'Cinza' },
  { id: 'teal', color: '#0d9488', label: 'Teal' },
];

export const PANTS_OPTIONS = [
  { id: 'dark', color: '#1e1e3a', label: 'Escura' },
  { id: 'jeans', color: '#2a3a5c', label: 'Jeans' },
  { id: 'black', color: '#111111', label: 'Preta' },
  { id: 'khaki', color: '#6b5b3e', label: 'Cáqui' },
  { id: 'charcoal', color: '#374151', label: 'Carvão' },
];

export const ROLE_OPTIONS = [
  { id: 'developer', label: 'Desenvolvedor', icon: '💻', desc: 'Escreve código e cria funcionalidades' },
  { id: 'scientist', label: 'Cientista', icon: '🔬', desc: 'Analisa dados e descobre padrões' },
  { id: 'designer', label: 'Designer', icon: '🎨', desc: 'Projeta interfaces e experiências' },
  { id: 'manager', label: 'Gerente', icon: '📊', desc: 'Coordena equipes e projetos' },
  { id: 'analyst', label: 'Analista', icon: '📈', desc: 'Extrai insights dos dados' },
  { id: 'security', label: 'Segurança', icon: '🔒', desc: 'Protege sistemas e dados' },
];

export const PRESET_AGENTS = [
  { name: 'Dr. Pavlov', role: ROLE_OPTIONS[1], skin: '#D4A574', hair: '#1a1a2e', shirt: '#6366f1', pants: '#1e1e3a' },
  { name: 'Dra. Ada', role: ROLE_OPTIONS[0], skin: '#FFDBAC', hair: '#3d2314', shirt: '#7c3aed', pants: '#111111' },
  { name: 'Agent Sigma', role: ROLE_OPTIONS[4], skin: '#8D5524', hair: '#1a1a2e', shirt: '#10b981', pants: '#2a3a5c' },
  { name: 'Hiro Tanaka', role: ROLE_OPTIONS[0], skin: '#F1C27D', hair: '#1a1a2e', shirt: '#06b6d4', pants: '#1e1e3a' },
  { name: 'Eva Martinez', role: ROLE_OPTIONS[2], skin: '#C68B59', hair: '#8b2500', shirt: '#e11d48', pants: '#111111' },
  { name: 'Marcus Reed', role: ROLE_OPTIONS[3], skin: '#6B3A1F', hair: '#1a1a2e', shirt: '#f59e0b', pants: '#374151' },
];

/* ==========================================================================
   PREVIEW 3D DO PERSONAGEM (mini canvas dentro do painel)
   ========================================================================== */
function PreviewHumanoid({ skin, hair, shirt, pants, role }: { skin: string; hair: string; shirt: string; pants: string; role: string }) {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const lArmRef = useRef<THREE.Group>(null!);
  const rArmRef = useRef<THREE.Group>(null!);
  const torsoRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;
    if (torsoRef.current) { torsoRef.current.scale.x = 1 + Math.sin(t * 1.8) * 0.015; }
    if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    if (lArmRef.current) lArmRef.current.rotation.x = Math.sin(t * 0.6) * 0.12;
    if (rArmRef.current) rArmRef.current.rotation.x = Math.sin(t * 0.6 + Math.PI) * 0.12;
  });

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      {/* Pernas */}
      <group position={[-0.1, 0.3, 0]}><mesh><capsuleGeometry args={[0.07, 0.4, 8, 12]} /><meshStandardMaterial color={pants} roughness={0.8} /></mesh><mesh position={[0, -0.26, 0.04]}><boxGeometry args={[0.12, 0.07, 0.18]} /><meshStandardMaterial color="#111" /></mesh></group>
      <group position={[0.1, 0.3, 0]}><mesh><capsuleGeometry args={[0.07, 0.4, 8, 12]} /><meshStandardMaterial color={pants} roughness={0.8} /></mesh><mesh position={[0, -0.26, 0.04]}><boxGeometry args={[0.12, 0.07, 0.18]} /><meshStandardMaterial color="#111" /></mesh></group>
      {/* Tronco */}
      <group ref={torsoRef} position={[0, 0.85, 0]}>
        <RoundedBox args={[0.38, 0.45, 0.25]} radius={0.08} castShadow>
          <meshStandardMaterial color={shirt} roughness={0.35} metalness={0.08} />
        </RoundedBox>
        {/* Detalhe da barra da jaqueta/camisa */}
        <RoundedBox args={[0.39, 0.06, 0.26]} position={[0, -0.2, 0]} radius={0.02} castShadow>
          <meshStandardMaterial color={shirt} roughness={0.4} />
        </RoundedBox>
        {/* Cinto */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[0.37, 0.03, 0.24]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* Braços */}
      <group ref={lArmRef} position={[-0.25, 0.95, 0]}>
        {/* Manga */}
        <mesh castShadow rotation={[0, 0, 0.2]} position={[-0.03, -0.05, 0]}><capsuleGeometry args={[0.07, 0.15, 12, 12]} /><meshStandardMaterial color={shirt} roughness={0.4} /></mesh>
        {/* Antebraço */}
        <mesh position={[-0.05, -0.18, 0]} rotation={[0, 0, 0.1]} castShadow><cylinderGeometry args={[0.045, 0.035, 0.2, 12]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        {/* Mão Retinha */}
        <mesh position={[-0.07, -0.33, 0]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.065, 0.1, 0.065]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={rArmRef} position={[0.25, 0.95, 0]}>
        {/* Manga */}
        <mesh castShadow rotation={[0, 0, -0.2]} position={[0.03, -0.05, 0]}><capsuleGeometry args={[0.07, 0.15, 12, 12]} /><meshStandardMaterial color={shirt} roughness={0.4} /></mesh>
        {/* Antebraço */}
        <mesh position={[0.05, -0.18, 0]} rotation={[0, 0, -0.1]} castShadow><cylinderGeometry args={[0.045, 0.035, 0.2, 12]} /><meshStandardMaterial color={skin} roughness={0.55} /></mesh>
        {/* Mão Retinha */}
        <mesh position={[0.07, -0.33, 0]} rotation={[0, 0, -0.1]} castShadow>
          <boxGeometry args={[0.065, 0.1, 0.065]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>
      {/* Pescoço */}
      <mesh position={[0, 1.12, 0]}><cylinderGeometry args={[0.055, 0.065, 0.1, 8]} /><meshStandardMaterial color={skin} /></mesh>
      {/* Cabeça */}
      <group ref={headRef} position={[0, 1.3, 0]}>
        <mesh><sphereGeometry args={[0.18, 24, 24]} /><meshStandardMaterial color={skin} roughness={0.5} /></mesh>
        <mesh position={[0, 0.07, -0.02]}><sphereGeometry args={[0.185, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={hair} roughness={0.9} /></mesh>
        <mesh position={[-0.06, 0, 0.155]}><sphereGeometry args={[0.03, 10, 10]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0.06, 0, 0.155]}><sphereGeometry args={[0.03, 10, 10]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[-0.06, 0, 0.17]}><sphereGeometry args={[0.015, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0.06, 0, 0.17]}><sphereGeometry args={[0.015, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>

        {role === 'Desenvolvedor' && (
          <group>
            {/* Headset de Gatinho */}
            <mesh position={[-0.12, 0.18, 0]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color={shirt} roughness={0.3} /></mesh>
            <mesh position={[0.12, 0.18, 0]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.04, 0.08, 4]} /><meshStandardMaterial color={shirt} roughness={0.3} /></mesh>
            <mesh position={[-0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.03, 16]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.03, 16]} /><meshStandardMaterial color="#111" /></mesh>
            {/* Óculos Geek Redondo */}
            <mesh position={[-0.065, 0, 0.172]}><torusGeometry args={[0.035, 0.007, 8, 24]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
            <mesh position={[0.065, 0, 0.172]}><torusGeometry args={[0.035, 0.007, 8, 24]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
            <mesh position={[0, 0, 0.174]}><boxGeometry args={[0.06, 0.007, 0.004]} /><meshStandardMaterial color="#1a1a2e" /></mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/* ==========================================================================
   COLOR SWATCH PICKER
   ========================================================================== */
function SwatchPicker({ options, value, onChange, large }: {
  options: { id: string; color: string; label: string }[];
  value: string; onChange: (c: string) => void; large?: boolean;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.color)}
          className={`group relative rounded-xl border-2 transition-all duration-200 ${value === opt.color ? 'border-white shadow-lg shadow-white/10 scale-105' : 'border-white/5 hover:border-white/25 hover:scale-102'} ${large ? 'w-12 h-12' : 'w-10 h-10'}`}
          style={{ backgroundColor: opt.color }}
          title={opt.label}
        >
          {value === opt.color && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm" />
            </div>
          )}
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-white/0 group-hover:text-white/50 transition-all whitespace-nowrap font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ==========================================================================
   SECTION HEADER
   ========================================================================== */
function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-6 h-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400">{number}</div>
      <div>
        <h3 className="text-[11px] font-semibold text-white/80 uppercase tracking-[0.12em]">{title}</h3>
        {subtitle && <p className="text-[9px] text-white/25 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ==========================================================================
   PAINEL PRINCIPAL DE CRIAÇÃO
   ========================================================================== */
export interface CreatorResult {
  name: string; role: string; roleIcon: string;
  skin: string; hair: string; shirt: string; pants: string; phase: number;
}

interface Props {
  onClose: () => void;
  onCreate: (agent: CreatorResult) => void;
}

export default function CharacterCreator({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [skin, setSkin] = useState(SKIN_OPTIONS[2].color);
  const [hair, setHair] = useState(HAIR_OPTIONS[0].color);
  const [shirt, setShirt] = useState(SHIRT_OPTIONS[0].color);
  const [pants, setPants] = useState(PANTS_OPTIONS[0].color);
  const [step, setStep] = useState<'preset' | 'custom'>('preset');

  const applyPreset = (preset: typeof PRESET_AGENTS[0]) => {
    setName(preset.name);
    setRole(preset.role);
    setSkin(preset.skin);
    setHair(preset.hair);
    setShirt(preset.shirt);
    setPants(preset.pants);
    setStep('custom');
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      role: role.label,
      roleIcon: role.icon,
      skin, hair, shirt, pants,
      phase: Math.random() * Math.PI * 2,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-[940px] max-w-[95vw] h-[620px] max-h-[90vh] bg-gradient-to-br from-[#0c0e1e] to-[#0a0c18] rounded-2xl border border-white/10 shadow-2xl shadow-black/50 flex overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* ============ LADO ESQUERDO: Preview 3D ============ */}
        <div className="w-[340px] shrink-0 flex flex-col border-r border-white/8 bg-gradient-to-b from-transparent to-indigo-950/10">
          {/* Preview 3D */}
          <div className="relative flex-1 min-h-0">
            <Canvas camera={{ position: [0, 0.5, 2.8], fov: 35 }} gl={{ antialias: true, alpha: true }}>
              <color attach="background" args={['#08080f']} />
              <ambientLight intensity={0.15} />
              <directionalLight position={[3, 5, 4]} intensity={1.5} color="#a78bfa" />
              <directionalLight position={[-2, 3, -1]} intensity={0.6} color="#10b981" />
              <pointLight position={[0, 2, 2]} intensity={1} color="#fff" />
              <PreviewHumanoid skin={skin} hair={hair} shirt={shirt} pants={pants} role={role.label} />
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
                <circleGeometry args={[0.8, 32]} />
                <meshStandardMaterial color="#0f1025" roughness={0.8} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, 0]}>
                <ringGeometry args={[0.7, 0.8, 32]} />
                <meshBasicMaterial color="#6366f1" transparent opacity={0.15} />
              </mesh>
            </Canvas>

            {/* Badge do cargo sobre o preview */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-xl">
              <span className="text-sm">{role.icon}</span>
              <span className="text-[10px] text-white/70 font-medium uppercase tracking-wider">{role.label}</span>
            </div>
          </div>

          {/* Info do personagem (abaixo do preview) */}
          <div className="p-4 border-t border-white/6 bg-black/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: shirt + '20', border: `1px solid ${shirt}40` }}>
                {role.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90 truncate">{name || 'Nome do Agente...'}</p>
                <p className="text-[9px] text-white/30">{role.desc}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/8">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: skin }} />
                <span className="text-[8px] text-white/30">Pele</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/8">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hair }} />
                <span className="text-[8px] text-white/30">Cabelo</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/8">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shirt }} />
                <span className="text-[8px] text-white/30">Camisa</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/8">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pants }} />
                <span className="text-[8px] text-white/30">Calça</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ LADO DIREITO: Opções ============ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
            <div>
              <h2 className="text-base font-bold tracking-[0.1em] uppercase text-white/90">Criar Agente IA</h2>
              <p className="text-[10px] text-white/30 mt-0.5 tracking-wider">Monte seu personagem e coloque-o para trabalhar</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Tabs */}
              <button onClick={() => setStep('preset')} className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all ${step === 'preset' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-white/30 hover:text-white/60'}`}>
                Templates
              </button>
              <button onClick={() => setStep('custom')} className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all ${step === 'custom' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-white/30 hover:text-white/60'}`}>
                Personalizar
              </button>
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white/30 flex items-center justify-center hover:text-white/70 hover:bg-white/10 transition text-xs">✕</button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {step === 'preset' ? (
              /* ====== TEMPLATES ====== */
              <div className="p-5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-4 font-medium">Escolha um template para começar rápido</p>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_AGENTS.map((preset, i) => (
                    <button key={i} onClick={() => applyPreset(preset)} className="group relative p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-300 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl relative overflow-hidden shrink-0" style={{ backgroundColor: preset.skin }}>
                          <div className="absolute top-0 left-0 right-0 h-5 rounded-t-xl" style={{ backgroundColor: preset.hair }} />
                          <div className="absolute bottom-0 left-0 right-0 h-4 rounded-b-xl" style={{ backgroundColor: preset.shirt }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate">{preset.name}</p>
                          <p className="text-[9px] text-white/30 mt-0.5">{preset.role.icon} {preset.role.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2.5">
                        {[preset.skin, preset.hair, preset.shirt, preset.pants].map((c, j) => (
                          <div key={j} className="w-4 h-4 rounded-md border border-white/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="absolute top-2 right-2 text-[9px] text-white/0 group-hover:text-indigo-400 transition-all bg-indigo-500/0 group-hover:bg-indigo-500/10 rounded-md px-2 py-0.5 border border-transparent group-hover:border-indigo-500/20">
                        Usar →
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl border border-dashed border-white/10 text-center">
                  <button onClick={() => setStep('custom')} className="text-[10px] text-white/30 hover:text-indigo-400 transition uppercase tracking-wider">
                    ✨ Ou crie do zero →
                  </button>
                </div>
              </div>
            ) : (
              /* ====== CUSTOMIZAR ====== */
              <div className="p-5 space-y-6">
                {/* Nome */}
                <div>
                  <SectionHeader number="1" title="Identidade" subtitle="Nome e função do agente no escritório" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Digite o nome do agente..." className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all" maxLength={24} />
                  <p className="text-[9px] text-white/20 mt-1 text-right">{name.length}/24</p>
                </div>

                {/* Cargo */}
                <div>
                  <SectionHeader number="2" title="Função" subtitle="O que este agente faz na empresa" />
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map(r => (
                      <button key={r.id} onClick={() => setRole(r)} className={`relative p-2.5 rounded-xl border text-left transition-all duration-200 ${role.id === r.id ? 'bg-indigo-600/15 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-white/[0.02] border-white/6 hover:border-white/15 hover:bg-white/[0.04]'}`}>
                        <span className="text-lg">{r.icon}</span>
                        <p className={`text-[10px] font-medium mt-1 ${role.id === r.id ? 'text-indigo-300' : 'text-white/50'}`}>{r.label}</p>
                        {role.id === r.id && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aparência */}
                <div>
                  <SectionHeader number="3" title="Aparência" subtitle="Personalize o visual do agente" />
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Tom de Pele</label>
                      <SwatchPicker options={SKIN_OPTIONS} value={skin} onChange={setSkin} large />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Cabelo</label>
                      <SwatchPicker options={HAIR_OPTIONS} value={hair} onChange={setHair} />
                    </div>
                  </div>
                </div>

                {/* Vestimenta */}
                <div>
                  <SectionHeader number="4" title="Vestimenta" subtitle="Escolha as roupas do agente" />
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Camisa</label>
                      <SwatchPicker options={SHIRT_OPTIONS} value={shirt} onChange={setShirt} />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 block">Calça</label>
                      <SwatchPicker options={PANTS_OPTIONS} value={pants} onChange={setPants} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/8 shrink-0 flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-white/10 text-[10px] text-white/40 uppercase tracking-wider hover:border-white/25 hover:text-white/60 transition-all">
              Cancelar
            </button>
            <div className="flex-1" />
            <button onClick={handleCreate} disabled={!name.trim()} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[11px] uppercase tracking-wider hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center gap-2">
              <span>🚀</span> Contratar Agente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
