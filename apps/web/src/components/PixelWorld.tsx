import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { LearnerState } from "@hero-lang/learning-engine";
import type { EnemyConfig, HeroActionEvent, HeroActionName, TrainingOption } from "../gameConfig";
import type { GraphicsPack, HeroAppearance } from "../storage";
import { t } from "../i18n";

export interface WorldEncounter {
  type: "training" | "fight";
  focus?: TrainingOption["focus"];
  enemy?: EnemyConfig;
}

interface PixelWorldProps {
  language: string;
  state: LearnerState;
  appearance: HeroAppearance;
  graphicsPack: GraphicsPack;
  debug: boolean;
  statCap: number;
  trainingOptions: TrainingOption[];
  actionEvent: HeroActionEvent | null;
  encounter: WorldEncounter | null;
  encounterMode: "approaching" | "active" | null;
  sessionActive: boolean;
}

interface SceneryPiece {
  id: string;
  kind: string;
  left: number;
  bottom: number;
  scale: number;
  layer: "far" | "pathside" | "front";
  flip: boolean;
  zIndex: number;
}

interface TerrainShape {
  groundD: string;
  grassD: string;
  pathD: string;
  heroBottom: number;
  heroLeft: number;
  encounterBottom: number;
  encounterLeft: number;
  label: string;
  yAt: (x: number) => number;
}

const FAR_KINDS = ["village_house", "watch_tower", "pine_tall", "round_tree", "blue_ruin", "distant_cave"];
const PATHSIDE_KINDS = ["sign", "chest", "crystal", "frog", "duck", "snail", "beehive", "mailbox", "tiny_dragon", "funny_boot"];
const FRONT_KINDS = ["mushroom", "flowers", "grass_clump", "cake", "butterfly", "umbrella", "pink_lolly", "round_bush"];

export function PixelWorld({ language, state, appearance, graphicsPack, debug, statCap, trainingOptions, actionEvent, encounter, encounterMode, sessionActive }: PixelWorldProps) {
  const [action, setAction] = useState<HeroActionName>("walk");
  const [tick, setTick] = useState(0);
  const moving = !sessionActive;
  const progress = state.path_distance * 1.9 + tick * 6.4;
  const terrain = useMemo(() => createTerrain(state.path_seed, progress, state.level), [state.path_seed, progress, state.level]);
  const scenery = useMemo(() => createScenery(state.path_seed, progress, state.level, terrain.yAt), [state.path_seed, progress, state.level, terrain]);
  const trainingOption = encounter?.focus ? trainingOptions.find((option) => option.focus === encounter.focus) : undefined;
  const style = useMemo(() => ({ ...heroVariables(appearance), "--far-x": `${-progress * 0.025}px`, "--mid-x": `${-progress * 0.08}px`, "--near-x": `${-progress * 0.16}px` }), [appearance, progress]);

  useEffect(() => {
    if (!moving) return;
    const handle = window.setInterval(() => setTick((value) => value + 1), 52);
    return () => window.clearInterval(handle);
  }, [moving]);

  useEffect(() => {
    if (!actionEvent) return;
    setAction(actionEvent.name);
    const handle = window.setTimeout(() => setAction(sessionActive ? "sword" : "walk"), 860);
    return () => window.clearTimeout(handle);
  }, [actionEvent?.serial, sessionActive]);

  useEffect(() => {
    if (!actionEvent) setAction(sessionActive ? "sword" : "walk");
  }, [sessionActive]);

  return (
    <section className={`pixel-world pixel-side-scroller theme-${graphicsPack} ${moving ? "world-moving" : "world-paused"} action-${action}`} style={style} aria-label="Hero path">
      <div className="pixel-sky">
        <div className="cloud cloud-a" />
        <div className="cloud cloud-b" />
        <div className="sun-pixel" />
      </div>

      <div className="parallax-layer far-skyline" aria-hidden="true">
        <i className="mountain m1" />
        <i className="mountain m2" />
        <i className="mountain m3" />
        <i className="soft-hill h1" />
        <i className="soft-hill h2" />
      </div>

      <div className="scenery-layer far-layer">
        {scenery.filter((piece) => piece.layer === "far").map((piece) => <Scenery key={piece.id} piece={piece} />)}
      </div>

      <svg className="terrain-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="terrain-shadow" d={terrain.groundD} />
        <path className="terrain-dirt" d={terrain.groundD} />
        <path className="terrain-grass" d={terrain.grassD} />
        <path className="walk-path" d={terrain.pathD} />
      </svg>

      <div className="scenery-layer pathside-layer">
        {scenery.filter((piece) => piece.layer === "pathside").map((piece) => <Scenery key={piece.id} piece={piece} />)}
      </div>

      {encounter?.type === "training" && trainingOption ? <TrainingEncounter option={trainingOption} language={language} mode={encounterMode} bottom={terrain.encounterBottom} left={terrain.encounterLeft} /> : null}
      {encounter?.type === "fight" && encounter.enemy ? <MonsterEncounter enemy={encounter.enemy} language={language} mode={encounterMode} bottom={terrain.encounterBottom} left={terrain.encounterLeft} /> : null}

      <HeroSprite action={action} inventory={state.inventory} appearance={appearance} bottom={terrain.heroBottom} left={terrain.heroLeft} />
      <ActionEffect action={action} />

      <div className="scenery-layer front-layer">
        {scenery.filter((piece) => piece.layer === "front").map((piece) => <Scenery key={piece.id} piece={piece} />)}
      </div>

      {debug ? (
        <div className="world-debug-card">
          <div><span>{t(language, "path")}</span><strong>{Math.floor(state.path_distance + tick)} m</strong></div>
          <div><span>{t(language, "pathShape")}</span><strong>{terrain.label}</strong></div>
          <div><span>{t(language, "statCap")}</span><strong>{statCap}</strong></div>
        </div>
      ) : null}
    </section>
  );
}

function HeroSprite({ action, inventory, appearance, bottom, left }: { action: HeroActionName; inventory: string[]; appearance: HeroAppearance; bottom: number; left: number }) {
  const hasCape = inventory.some((item) => item.includes("cape") || item.includes("armor"));
  const hasSword = inventory.some((item) => item.includes("sword"));
  const hasBoots = inventory.some((item) => item.includes("boots") || item.includes("sneakers"));
  const hasPet = inventory.some((item) => item.includes("pet"));
  const hasHat = inventory.some((item) => item.includes("hat"));

  return (
    <div className={`hero-sprite hero-${action} hair-${appearance.hairStyle} eyes-${appearance.eyeStyle}`} style={{ bottom: `${bottom}%`, left: `${left}%` }} aria-hidden="true">
      <div className="hero-shadow" />
      {hasCape ? <div className="hero-cape" /> : null}
      <div className="hero-backpack" />
      <div className="hero-leg leg-back"><span className={hasBoots ? "boot" : ""} /></div>
      <div className="hero-leg leg-front"><span className={hasBoots ? "boot" : ""} /></div>
      <div className="hero-body"><i className="hero-shirt-star" /><i className="hero-belt" /></div>
      <div className="hero-arm arm-back"><span /></div>
      <div className="hero-arm arm-front"><span /></div>
      <div className="hero-scarf" />
      <div className="hero-head">
        {hasHat ? <div className="hero-fox-hat" /> : null}
        <div className="hero-hair" />
        <div className="hero-eye" />
        <div className="hero-cheek" />
        <div className="hero-smile" />
      </div>
      {hasSword ? <div className="hero-blade" /> : null}
      <div className="training-rock-held" />
      <div className="hero-shield-prop" />
      {hasPet ? <div className="pet-dragon" /> : null}
    </div>
  );
}

function ActionEffect({ action }: { action: HeroActionName }) {
  if (action === "super_punch") return <div className="action-effect super-effect"><span>POW!</span></div>;
  if (action === "fart_attack") return <div className="action-effect fart-effect"><span>pffft</span><i /><i /><i /><i /></div>;
  if (action === "self_punch") return <div className="action-effect self-effect"><span>bonk!</span></div>;
  if (action === "hero_hit") return <div className="action-effect hit-effect"><span>zap!</span></div>;
  if (action === "parry" || action === "shield_block") return <div className="action-effect parry-effect"><span>block!</span></div>;
  if (action === "dagger_throw" || action === "target_throw") return <div className="action-effect throw-effect"><span>whoosh!</span><b /></div>;
  if (action === "strategy_spell" || action === "puzzle_think") return <div className="action-effect magic-effect"><span>aha!</span></div>;
  if (action === "lift_rock") return <div className="action-effect lift-effect"><span>up!</span></div>;
  if (action === "letter_trace") return <div className="action-effect trace-effect"><span>Ա!</span></div>;
  if (action === "monster_defeat") return <div className="action-effect defeat-effect"><span>poof!</span></div>;
  if (action === "enemy_hit") return <div className="action-effect ouch-effect"><span>ouch!</span></div>;
  if (action === "victory") return <div className="action-effect victory-effect"><span>★</span><span>★</span><span>★</span></div>;
  return null;
}

function TrainingEncounter({ option, language, mode, bottom, left }: { option: TrainingOption; language: string; mode: "approaching" | "active" | null; bottom: number; left: number }) {
  return (
    <div className={`encounter-sprite training-sprite encounter-${mode ?? "idle"} training-${option.encounter}`} style={{ bottom: `${bottom}%`, left: `${left}%` }} aria-hidden="true">
      <div className="challenge-platform" />
      <div className="training-object">
        <div className="prop prop-stone" />
        <div className="prop prop-shield" />
        <div className="prop prop-target" />
        <div className="prop prop-puzzle" />
        <div className="prop prop-letter">Ա</div>
      </div>
      <div className="challenge-label">{t(language, option.encounterLabelKey)}</div>
    </div>
  );
}

function MonsterEncounter({ enemy, language, mode, bottom, left }: { enemy: EnemyConfig; language: string; mode: "approaching" | "active" | null; bottom: number; left: number }) {
  return (
    <div className={`encounter-sprite monster-sprite encounter-${mode ?? "idle"} monster-${enemy.sprite} monster-variant-${enemy.visualVariant ?? "default"}`} style={{ bottom: `${bottom}%`, left: `${left}%`, transform: `scale(${enemy.scale})` }} aria-hidden="true">
      <div className="monster-shadow" />
      <div className="monster-body">
        <div className="monster-eye monster-eye-left" />
        <div className="monster-eye monster-eye-right" />
        <div className="monster-mouth" />
        <div className="monster-tooth" />
        <div className="monster-horn horn-left" />
        <div className="monster-horn horn-right" />
        <div className="monster-wing wing-left" />
        <div className="monster-wing wing-right" />
      </div>
      <div className="monster-name-tag">{t(language, enemy.nameKey)}</div>
    </div>
  );
}

function Scenery({ piece }: { piece: SceneryPiece }) {
  return (
    <span
      className={`scenery scenery-${piece.kind} ${piece.flip ? "flip" : ""}`}
      style={{ left: `${piece.left}%`, bottom: `${piece.bottom}%`, transform: `scale(${piece.scale})`, zIndex: piece.zIndex }}
      aria-hidden="true"
    />
  );
}

function createTerrain(seed: number, progress: number, level: number): TerrainShape {
  const phase = seed * 0.0009 + progress * 0.012 + level * 0.27;
  const yAt = (x: number) => 68 + Math.sin(phase + x * 0.095) * 4.2 + Math.sin(phase * 0.63 + x * 0.19) * 1.8;
  const points = [0, 16, 32, 50, 68, 84, 100].map((x) => ({ x, y: yAt(x) }));
  const curve = `M ${points[0].x} ${points[0].y.toFixed(2)} ` +
    `C 8 ${(points[0].y - 2).toFixed(2)}, 10 ${(points[1].y + 2).toFixed(2)}, ${points[1].x} ${points[1].y.toFixed(2)} ` +
    `S ${points[2].x - 7} ${(points[2].y - 1).toFixed(2)}, ${points[2].x} ${points[2].y.toFixed(2)} ` +
    `S ${points[3].x - 7} ${(points[3].y + 2).toFixed(2)}, ${points[3].x} ${points[3].y.toFixed(2)} ` +
    `S ${points[4].x - 7} ${(points[4].y - 2).toFixed(2)}, ${points[4].x} ${points[4].y.toFixed(2)} ` +
    `S ${points[5].x - 7} ${(points[5].y + 1).toFixed(2)}, ${points[5].x} ${points[5].y.toFixed(2)} ` +
    `S 94 ${(points[6].y - 1).toFixed(2)}, ${points[6].x} ${points[6].y.toFixed(2)}`;
  const lowerCurve = points.slice().reverse().map((point) => `${point.x} ${(point.y + 7.8).toFixed(2)}`).join(" L ");
  const groundD = `${curve} L 100 100 L 0 100 Z`;
  const grassD = `${curve} L ${lowerCurve} Z`;
  const pathD = `${curve} L ${points.slice().reverse().map((point) => `${point.x} ${(point.y + 3.4).toFixed(2)}`).join(" L ")} Z`;
  const spread = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
  const label = spread > 7 ? "curvy" : spread < 4 ? "thin" : "wide";
  return {
    groundD,
    grassD,
    pathD,
    yAt,
    heroLeft: 23,
    heroBottom: 100 - yAt(23) + 1.8,
    encounterLeft: 76,
    encounterBottom: 100 - yAt(76) + 1.8,
    label
  };
}

function createScenery(seed: number, progress: number, level: number, yAt: (x: number) => number): SceneryPiece[] {
  const pieces: SceneryPiece[] = [];
  addLayer(pieces, "far", FAR_KINDS, 12, seed + level * 17, progress, 0.028, yAt, 1);
  addLayer(pieces, "pathside", PATHSIDE_KINDS, 14, seed + level * 41, progress, 0.075, yAt, 10);
  addLayer(pieces, "front", FRONT_KINDS, 16, seed + level * 67, progress, 0.105, yAt, 40);
  return pieces;
}

function addLayer(pieces: SceneryPiece[], layer: SceneryPiece["layer"], kinds: string[], count: number, seed: number, progress: number, speed: number, yAt: (x: number) => number, zBase: number): void {
  for (let index = 0; index < count; index += 1) {
    const raw = seed * 0.013 + index * (122 / count) - progress * speed;
    const left = wrap(raw, -22, 122);
    const kind = kinds[Math.abs(Math.floor(seed + index * 7)) % kinds.length] ?? kinds[0];
    const surfaceBottom = 100 - yAt(left);
    const jitter = seededNoise(seed + index * 11) * 3;
    const bottom = layer === "far" ? surfaceBottom + 4 + jitter : layer === "pathside" ? surfaceBottom + 1 + jitter * 0.35 : Math.max(0, surfaceBottom - 13 + jitter);
    const scale = layer === "far" ? 0.66 + seededNoise(seed + index) * 0.18 : layer === "pathside" ? 0.78 + seededNoise(seed + index) * 0.22 : 0.92 + seededNoise(seed + index) * 0.24;
    pieces.push({ id: `${layer}-${index}-${kind}`, kind, left, bottom, scale, layer, flip: seededNoise(seed + index * 19) > 0.5, zIndex: zBase + index });
  }
}

function wrap(value: number, min: number, max: number): number {
  const size = max - min;
  return ((((value - min) % size) + size) % size) + min;
}

function seededNoise(value: number): number {
  const raw = Math.sin(value * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function heroVariables(appearance: HeroAppearance) {
  return {
    "--hero-skin": appearance.skinTone,
    "--hero-hair": appearance.hairColor,
    "--hero-shirt": appearance.outfitColor,
    "--hero-pants": appearance.pantsColor,
    "--hero-scarf": appearance.scarfColor
  } as CSSProperties;
}
