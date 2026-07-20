import type { PackLabyrinthConfig } from "@hero-lang/content-schema";
import type {
  LearnerState,
  TrainingFocus,
  TrainingQuestion
} from "@hero-lang/learning-engine";

export type LabyrinthDirection = "north" | "east" | "south" | "west";
export type LabyrinthCellKind =
  | "path"
  | "entrance"
  | "rune"
  | "monster"
  | "trap"
  | "cache"
  | "healing"
  | "reveal"
  | "treasure";
export type LabyrinthEncounterKind = "rune" | "monster" | "trap" | "guardian";
export type LabyrinthStatus = "exploring" | "question";
export type LabyrinthImmediateEvent = "cache" | "healing" | "reveal";
export type LabyrinthLogTone = "story" | "success" | "danger" | "reward" | "discovery";

export interface LabyrinthLogEntry {
  id: string;
  key: string;
  params?: Record<string, string | number>;
  tone: LabyrinthLogTone;
  createdAt: string;
}

export interface LabyrinthCell {
  id: string;
  row: number;
  column: number;
  exits: LabyrinthDirection[];
  kind: LabyrinthCellKind;
  focus?: TrainingFocus;
  encounterId?: string;
  floorVariant: number;
  eventVariant?: number;
  eventValue?: number;
  resolved?: boolean;
}

export interface LabyrinthEncounterPlan {
  id: string;
  cellId: string;
  kind: LabyrinthEncounterKind;
  focuses: TrainingFocus[];
  completed: boolean;
}

export interface LabyrinthFeedback {
  correct: boolean;
  correctAnswer: string;
  selectedOptionId?: string;
  correctOptionId?: string;
}

export interface LabyrinthSession {
  version: 4;
  configId: string;
  seed: number;
  width: number;
  height: number;
  cells: LabyrinthCell[];
  encounters: LabyrinthEncounterPlan[];
  positionCellId: string;
  exploredCellIds: string[];
  revealedCellIds: string[];
  collectedRunes: TrainingFocus[];
  hearts: number;
  maxHearts: number;
  runCoins: number;
  questionsAnswered: number;
  correctCount: number;
  mistakeCount: number;
  practiceState: LearnerState;
  status: LabyrinthStatus;
  currentEncounterId?: string;
  currentQuestionIndex: number;
  currentQuestion?: TrainingQuestion;
  locked: boolean;
  feedback?: LabyrinthFeedback | null;
  messageKey?: string;
  log: LabyrinthLogEntry[];
  startedAt: string;
  baseXp: number;
  basePathDistance: number;
}

export interface LabyrinthMoveResult {
  session: LabyrinthSession;
  event:
    | "moved"
    | "encounter"
    | "treasure_locked"
    | LabyrinthImmediateEvent
    | "invalid";
}

export interface LabyrinthWallEdge {
  /** Stable identifier for this unique closed maze edge. */
  id: string;
  /** Cell that canonically owns the edge. */
  cellId: string;
  /** Adjacent cell on the other side, absent for an outer boundary. */
  adjacentCellId?: string;
  /** Logical direction from the owning cell. */
  direction: LabyrinthDirection;
}

export interface LabyrinthTopologyValidation {
  valid: boolean;
  issues: string[];
  connectedCells: number;
  expectedCells: number;
  wallEdges: number;
  expectedWallEdges: number;
}

export const LABYRINTH_FOCUSES: readonly TrainingFocus[] = [
  "vocabulary",
  "comprehension",
  "grammar",
  "pronunciation"
];

const DELTAS: Record<LabyrinthDirection, { row: number; column: number; opposite: LabyrinthDirection }> = {
  north: { row: -1, column: 0, opposite: "south" },
  east: { row: 0, column: 1, opposite: "west" },
  south: { row: 1, column: 0, opposite: "north" },
  west: { row: 0, column: -1, opposite: "east" }
};

export function createLabyrinthSession(
  config: PackLabyrinthConfig,
  learnerState: LearnerState,
  seed = Math.floor(Math.random() * 2_147_483_647)
): LabyrinthSession {
  const width = clampInt(config.map.width, 5, 11);
  const height = clampInt(config.map.height, 5, 11);
  const random = mulberry32(seed);
  const cells = createMaze(width, height, random);
  const entrance = getCell(cells, height - 1, 0)!;
  entrance.kind = "entrance";

  const distances = getDistances(cells, entrance.id);
  const treasure = [...cells]
    .filter((cell) => cell.id !== entrance.id)
    .sort((a, b) => (distances.get(b.id) ?? 0) - (distances.get(a.id) ?? 0))[0]!;
  treasure.kind = "treasure";

  const candidates = shuffleWithRandom(
    cells.filter((cell) => cell.id !== entrance.id && cell.id !== treasure.id),
    random
  ).sort((a, b) => (distances.get(b.id) ?? 0) - (distances.get(a.id) ?? 0));

  const targetQuestions = clampInt(
    config.questions.target,
    config.questions.minimum,
    config.questions.maximum
  );
  const minPerFocus = Math.max(1, Math.floor(config.questions.minimum_per_focus));
  const requestedMonsterCount = clampInt(config.questions.monster_encounters ?? 3, 1, 6);
  const requestedTrapCount = clampInt(config.events?.trap_encounters ?? 3, 0, 6);

  const encounters: LabyrinthEncounterPlan[] = [];
  const occupied = new Set<string>([entrance.id, treasure.id]);

  LABYRINTH_FOCUSES.forEach((focus, index) => {
    const cell = pickUnusedCandidate(candidates, occupied, index * 2);
    if (!cell) return;
    occupied.add(cell.id);
    cell.kind = "rune";
    cell.focus = focus;
    cell.eventVariant = index;
    const id = `rune:${focus}`;
    cell.encounterId = id;
    encounters.push({
      id,
      cellId: cell.id,
      kind: "rune",
      focuses: Array.from({ length: minPerFocus }, () => focus),
      completed: false
    });
  });

  const runeQuestions = encounters.reduce((sum, encounter) => sum + encounter.focuses.length, 0);
  const remainingBudget = Math.max(1, targetQuestions - runeQuestions);
  const trapCount = Math.min(requestedTrapCount, Math.max(0, remainingBudget - 2));
  const afterTraps = Math.max(1, remainingBudget - trapCount);
  const monsterCount = Math.min(requestedMonsterCount, Math.max(1, afterTraps - 1));

  let guardianQuestions = Math.max(1, Math.round(afterTraps * 0.4));
  let monsterQuestionBudget = afterTraps - guardianQuestions;
  if (monsterQuestionBudget < monsterCount) {
    guardianQuestions = Math.max(1, afterTraps - monsterCount);
    monsterQuestionBudget = Math.max(monsterCount, afterTraps - guardianQuestions);
  }
  const monsterQuestionCounts = distributeCount(monsterQuestionBudget, monsterCount);

  for (let index = 0; index < trapCount; index += 1) {
    const cell = pickUnusedCandidate(candidates, occupied, 8 + index * 3);
    if (!cell) break;
    occupied.add(cell.id);
    cell.kind = "trap";
    cell.eventVariant = index % 4;
    const id = `trap:${index + 1}`;
    cell.encounterId = id;
    encounters.push({
      id,
      cellId: cell.id,
      kind: "trap",
      focuses: buildMixedFocuses(1, learnerState, random),
      completed: false
    });
  }

  for (let index = 0; index < monsterCount; index += 1) {
    const cell = pickUnusedCandidate(candidates, occupied, 18 + index * 3);
    if (!cell) break;
    occupied.add(cell.id);
    cell.kind = "monster";
    cell.eventVariant = index % 3;
    const id = `monster:${index + 1}`;
    cell.encounterId = id;
    encounters.push({
      id,
      cellId: cell.id,
      kind: "monster",
      focuses: buildMixedFocuses(monsterQuestionCounts[index] ?? 1, learnerState, random),
      completed: false
    });
  }

  placeImmediateEvents(candidates, occupied, config, random);

  const guardianId = "guardian:treasure";
  treasure.encounterId = guardianId;
  treasure.eventVariant = 0;
  encounters.push({
    id: guardianId,
    cellId: treasure.id,
    kind: "guardian",
    focuses: buildMixedFocuses(guardianQuestions, learnerState, random),
    completed: false
  });

  const revealed = revealAround(cells, entrance.id, new Set<string>());

  return {
    version: 4,
    configId: config.id,
    seed,
    width,
    height,
    cells,
    encounters,
    positionCellId: entrance.id,
    exploredCellIds: [entrance.id],
    revealedCellIds: [...revealed],
    collectedRunes: [],
    hearts: Math.max(1, Math.floor(config.hearts)),
    maxHearts: Math.max(1, Math.floor(config.hearts)),
    runCoins: 0,
    questionsAnswered: 0,
    correctCount: 0,
    mistakeCount: 0,
    practiceState: learnerState,
    status: "exploring",
    currentQuestionIndex: 0,
    locked: false,
    feedback: null,
    log: [{ id: `log:${seed}:start`, key: "labyrinthLogStarted", tone: "story", createdAt: new Date().toISOString() }],
    startedAt: new Date().toISOString(),
    baseXp: learnerState.xp,
    basePathDistance: learnerState.path_distance
  };
}

export function moveLabyrinthSession(
  session: LabyrinthSession,
  targetCellId: string,
  config?: PackLabyrinthConfig
): LabyrinthMoveResult {
  if (session.status !== "exploring" || session.locked) {
    return { session, event: "invalid" };
  }

  const current = findCell(session, session.positionCellId);
  const target = findCell(session, targetCellId);
  if (!current || !target || !areConnected(current, target)) {
    return { session, event: "invalid" };
  }

  const explored = new Set(session.exploredCellIds);
  explored.add(target.id);
  const revealed = revealAround(session.cells, target.id, new Set(session.revealedCellIds));
  const encounter = getEncounterForCell(session, target.id);

  let moved: LabyrinthSession = {
    ...session,
    positionCellId: target.id,
    exploredCellIds: [...explored],
    revealedCellIds: [...revealed],
    messageKey: undefined,
    feedback: null
  };

  if (!target.resolved && target.kind === "cache") {
    const cells = markCellResolved(session.cells, target.id);
    moved = appendLabyrinthLog({
      ...moved,
      cells,
      runCoins: moved.runCoins + Math.max(0, target.eventValue ?? 0),
      messageKey: "labyrinthCacheFound"
    }, "labyrinthLogCache", { coins: Math.max(0, target.eventValue ?? 0) }, "reward");
    return { session: moved, event: "cache" };
  }

  if (!target.resolved && target.kind === "healing") {
    const cells = markCellResolved(session.cells, target.id);
    const recovered = moved.hearts < moved.maxHearts;
    moved = appendLabyrinthLog({
      ...moved,
      cells,
      hearts: Math.min(moved.maxHearts, moved.hearts + 1),
      messageKey: moved.hearts >= moved.maxHearts ? "labyrinthHealingFull" : "labyrinthHealingFound"
    }, recovered ? "labyrinthLogHealing" : "labyrinthLogHealingFull", {}, "success");
    return { session: moved, event: "healing" };
  }

  if (!target.resolved && target.kind === "reveal") {
    const cells = markCellResolved(session.cells, target.id);
    const revealRadius = Math.max(1, Math.floor(config?.events?.reveal_radius ?? 2));
    const expanded = revealWithinRadius(cells, target.id, new Set(moved.revealedCellIds), revealRadius);
    moved = appendLabyrinthLog({
      ...moved,
      cells,
      revealedCellIds: [...expanded],
      messageKey: "labyrinthRevealFound"
    }, "labyrinthLogReveal", {}, "discovery");
    return { session: moved, event: "reveal" };
  }

  if (!encounter || encounter.completed) {
    return { session: moved, event: "moved" };
  }

  if (encounter.kind === "guardian" && session.collectedRunes.length < LABYRINTH_FOCUSES.length) {
    return {
      session: appendLabyrinthLog({ ...moved, messageKey: "labyrinthTreasureLocked" }, "labyrinthLogTreasureLocked", {}, "discovery"),
      event: "treasure_locked"
    };
  }

  const encounterKey = encounter.kind === "rune"
    ? "labyrinthLogRuneEncounter"
    : encounter.kind === "trap"
      ? "labyrinthLogTrapEncounter"
      : encounter.kind === "guardian"
        ? "labyrinthLogGuardianEncounter"
        : "labyrinthLogMonsterEncounter";
  return {
    session: appendLabyrinthLog({
      ...moved,
      status: "question",
      currentEncounterId: encounter.id,
      currentQuestionIndex: 0,
      currentQuestion: undefined,
      locked: false
    }, encounterKey, {}, encounter.kind === "trap" ? "danger" : "discovery"),
    event: "encounter"
  };
}

export function getLabyrinthNeighbors(session: LabyrinthSession): LabyrinthCell[] {
  const current = findCell(session, session.positionCellId);
  if (!current) return [];
  return current.exits
    .map((direction) => {
      const delta = DELTAS[direction];
      return getCell(session.cells, current.row + delta.row, current.column + delta.column);
    })
    .filter((cell): cell is LabyrinthCell => Boolean(cell));
}


/** Return the connected neighboring cell in one logical direction. */
export function getLabyrinthNeighbor(
  session: Pick<LabyrinthSession, "cells" | "positionCellId">,
  direction: LabyrinthDirection
): LabyrinthCell | undefined {
  const current = findCell(session, session.positionCellId);
  if (!current || !current.exits.includes(direction)) return undefined;
  const delta = DELTAS[direction];
  return getCell(session.cells, current.row + delta.row, current.column + delta.column);
}

/**
 * Build every closed wall exactly once, independently of fog/reveal state.
 *
 * Internal shared walls are owned by the south/east cell through its north or
 * west edge. South and east edges are only emitted at the outer map boundary.
 * This gives stable IDs and prevents a wall from changing owner as rooms are
 * revealed.
 */
export function getLabyrinthWallEdges(
  source: Pick<LabyrinthSession, "cells" | "width" | "height">
): LabyrinthWallEdge[] {
  const edges: LabyrinthWallEdge[] = [];
  const cellsById = new Map(source.cells.map((cell) => [cell.id, cell]));

  const addEdge = (cell: LabyrinthCell, direction: LabyrinthDirection): void => {
    if (cell.exits.includes(direction)) return;
    const delta = DELTAS[direction];
    const neighborId = cellId(cell.row + delta.row, cell.column + delta.column);
    const adjacentCellId = cellsById.has(neighborId) ? neighborId : undefined;
    edges.push({
      id: `${cell.id}:${direction}`,
      cellId: cell.id,
      adjacentCellId,
      direction
    });
  };

  for (const cell of source.cells) {
    addEdge(cell, "north");
    addEdge(cell, "west");
    if (cell.row === source.height - 1) addEdge(cell, "south");
    if (cell.column === source.width - 1) addEdge(cell, "east");
  }

  return edges;
}

/** Validate maze connectivity, reciprocal passages, and canonical wall count. */
export function validateLabyrinthTopology(
  source: Pick<LabyrinthSession, "cells" | "width" | "height">
): LabyrinthTopologyValidation {
  const issues: string[] = [];
  const cellsById = new Map(source.cells.map((cell) => [cell.id, cell]));

  for (const cell of source.cells) {
    for (const direction of cell.exits) {
      const delta = DELTAS[direction];
      const neighbor = cellsById.get(cellId(cell.row + delta.row, cell.column + delta.column));
      if (!neighbor) {
        issues.push(`${cell.id} exits ${direction} outside the map`);
        continue;
      }
      if (!neighbor.exits.includes(delta.opposite)) {
        issues.push(`${cell.id}:${direction} is not reciprocal with ${neighbor.id}:${delta.opposite}`);
      }
    }
  }

  const start = source.cells[0];
  const visited = new Set<string>();
  if (start) {
    const queue = [start.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = cellsById.get(currentId);
      if (!current) continue;
      for (const direction of current.exits) {
        const delta = DELTAS[direction];
        const neighborId = cellId(current.row + delta.row, current.column + delta.column);
        if (cellsById.has(neighborId) && !visited.has(neighborId)) queue.push(neighborId);
      }
    }
  }

  if (visited.size !== source.cells.length) {
    issues.push(`maze is disconnected: reached ${visited.size}/${source.cells.length} cells`);
  }

  const wallEdges = getLabyrinthWallEdges(source);
  const uniqueIds = new Set(wallEdges.map((edge) => edge.id));
  if (uniqueIds.size !== wallEdges.length) issues.push("duplicate canonical wall edge IDs detected");

  const internalAdjacencies = source.height * Math.max(0, source.width - 1)
    + source.width * Math.max(0, source.height - 1);
  const boundaryEdges = 2 * source.width + 2 * source.height;
  const passages = source.cells.reduce((sum, cell) => sum + cell.exits.length, 0) / 2;
  const expectedWallEdges = internalAdjacencies + boundaryEdges - passages;
  if (wallEdges.length !== expectedWallEdges) {
    issues.push(`wall edge count mismatch: ${wallEdges.length}/${expectedWallEdges}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    connectedCells: visited.size,
    expectedCells: source.cells.length,
    wallEdges: wallEdges.length,
    expectedWallEdges
  };
}

export function getCurrentLabyrinthEncounter(session: LabyrinthSession): LabyrinthEncounterPlan | undefined {
  return session.encounters.find((encounter) => encounter.id === session.currentEncounterId);
}

export function getCurrentLabyrinthFocus(session: LabyrinthSession): TrainingFocus | undefined {
  const encounter = getCurrentLabyrinthEncounter(session);
  if (!encounter) return undefined;
  return encounter.focuses[session.currentQuestionIndex] ?? encounter.focuses[encounter.focuses.length - 1];
}

export function getTrapHeartLoss(config: PackLabyrinthConfig): number {
  return Math.max(1, Math.floor(config.events?.trap_heart_loss ?? 2));
}

export function completeCurrentLabyrinthEncounter(session: LabyrinthSession): {
  session: LabyrinthSession;
  completedLabyrinth: boolean;
  collectedRune?: TrainingFocus;
} {
  const encounter = getCurrentLabyrinthEncounter(session);
  if (!encounter) return { session, completedLabyrinth: false };

  const encounters = session.encounters.map((candidate) =>
    candidate.id === encounter.id ? { ...candidate, completed: true } : candidate
  );
  const cells = markCellResolved(session.cells, encounter.cellId);
  const collectedRunes = [...session.collectedRunes];
  let collectedRune: TrainingFocus | undefined;

  if (encounter.kind === "rune") {
    const cell = findCell(session, encounter.cellId);
    if (cell?.focus && !collectedRunes.includes(cell.focus)) {
      collectedRunes.push(cell.focus);
      collectedRune = cell.focus;
    }
  }

  const completedLabyrinth = encounter.kind === "guardian";
  const messageKey = collectedRune
    ? "labyrinthRuneFound"
    : encounter.kind === "trap"
      ? "labyrinthTrapCleared"
      : encounter.kind === "monster"
        ? "labyrinthMonsterCleared"
        : undefined;

  const logKey = collectedRune
    ? "labyrinthLogRuneCollected"
    : encounter.kind === "trap"
      ? "labyrinthLogTrapCleared"
      : encounter.kind === "monster"
        ? "labyrinthLogMonsterCleared"
        : "labyrinthLogGuardianDefeated";
  return {
    session: appendLabyrinthLog({
      ...session,
      cells,
      encounters,
      collectedRunes,
      status: "exploring",
      currentEncounterId: undefined,
      currentQuestionIndex: 0,
      currentQuestion: undefined,
      locked: false,
      feedback: null,
      messageKey
    }, logKey, collectedRune ? { focus: collectedRune } : {}, "success"),
    completedLabyrinth,
    collectedRune
  };
}

export function findCell(session: LabyrinthSession, id: string): LabyrinthCell | undefined;
export function findCell(session: { cells: LabyrinthCell[] }, id: string): LabyrinthCell | undefined;
export function findCell(session: { cells: LabyrinthCell[] }, id: string): LabyrinthCell | undefined {
  return session.cells.find((cell) => cell.id === id);
}

export function getEncounterForCell(
  session: LabyrinthSession,
  cellId: string
): LabyrinthEncounterPlan | undefined {
  return session.encounters.find((encounter) => encounter.cellId === cellId);
}

export function getLabyrinthQuestionTotal(session: LabyrinthSession): number {
  return session.encounters.reduce((sum, encounter) => sum + encounter.focuses.length, 0);
}

export function sanitizeLabyrinthSession(
  value: unknown,
  learnerState: LearnerState,
  config: PackLabyrinthConfig
): LabyrinthSession | null {
  if (!isObject(value) || ![1, 2, 3, 4].includes(Number(value.version)) || value.configId !== config.id) return null;
  if (!Array.isArray(value.cells) || !Array.isArray(value.encounters)) return null;
  if (typeof value.positionCellId !== "string") return null;

  const cells = value.cells.filter(isLabyrinthCell).map((cell) => ({
    ...cell,
    floorVariant: clampInt(cell.floorVariant ?? 0, 0, 2)
  }));
  const encounters = value.encounters.filter(isLabyrinthEncounter);
  if (cells.length < 1 || encounters.length < 1) return null;
  if (!cells.some((cell) => cell.id === value.positionCellId)) return null;

  const practiceState = isObject(value.practiceState)
    ? (value.practiceState as unknown as LearnerState)
    : learnerState;

  const currentQuestion = isObject(value.currentQuestion)
    ? (value.currentQuestion as unknown as TrainingQuestion)
    : undefined;
  const maxHearts = Math.max(1, safeInteger(value.maxHearts, config.hearts));

  return {
    version: 4,
    configId: config.id,
    seed: safeInteger(value.seed, 0),
    width: safeInteger(value.width, config.map.width),
    height: safeInteger(value.height, config.map.height),
    cells,
    encounters,
    positionCellId: value.positionCellId,
    exploredCellIds: stringArray(value.exploredCellIds).filter((id) => cells.some((cell) => cell.id === id)),
    revealedCellIds: stringArray(value.revealedCellIds).filter((id) => cells.some((cell) => cell.id === id)),
    collectedRunes: focusArray(value.collectedRunes),
    hearts: clampInt(safeInteger(value.hearts, config.hearts), 0, maxHearts),
    maxHearts,
    runCoins: Math.max(0, safeInteger(value.runCoins, 0)),
    questionsAnswered: Math.max(0, safeInteger(value.questionsAnswered, 0)),
    correctCount: Math.max(0, safeInteger(value.correctCount, 0)),
    mistakeCount: Math.max(0, safeInteger(value.mistakeCount, 0)),
    practiceState,
    status: value.status === "question" ? "question" : "exploring",
    currentEncounterId: typeof value.currentEncounterId === "string" ? value.currentEncounterId : undefined,
    currentQuestionIndex: Math.max(0, safeInteger(value.currentQuestionIndex, 0)),
    currentQuestion,
    locked: false,
    feedback: null,
    messageKey: typeof value.messageKey === "string" ? value.messageKey : undefined,
    log: normalizeLabyrinthLog(value.log),
    startedAt: typeof value.startedAt === "string" ? value.startedAt : new Date().toISOString(),
    baseXp: Math.max(0, safeInteger(value.baseXp, learnerState.xp)),
    basePathDistance: Math.max(0, safeInteger(value.basePathDistance, learnerState.path_distance))
  };
}


export function appendLabyrinthLog(
  session: LabyrinthSession,
  key: string,
  params: Record<string, string | number> = {},
  tone: LabyrinthLogTone = "story"
): LabyrinthSession {
  const entry: LabyrinthLogEntry = {
    id: `log:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    key,
    params: Object.keys(params).length > 0 ? params : undefined,
    tone,
    createdAt: new Date().toISOString()
  };
  return { ...session, log: [...(session.log ?? []), entry].slice(-40) };
}

function normalizeLabyrinthLogTone(value: unknown): LabyrinthLogTone {
  return value === "success" || value === "danger" || value === "reward" || value === "discovery"
    ? value
    : "story";
}

function normalizeLabyrinthLog(value: unknown): LabyrinthLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((entry, index) => ({
      id: typeof entry.id === "string" ? entry.id : `restored:${index}`,
      key: typeof entry.key === "string" ? entry.key : "labyrinthLogStarted",
      params: isObject(entry.params)
        ? Object.fromEntries(
            Object.entries(entry.params).filter((entry): entry is [string, string | number] =>
              typeof entry[1] === "string" || typeof entry[1] === "number"
            )
          )
        : undefined,
      tone: normalizeLabyrinthLogTone(entry.tone),
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString()
    }))
    // Older saves recorded every empty room. Keep only meaningful adventure
    // events so restored logs remain readable.
    .filter((entry) => entry.key !== "labyrinthLogMoved")
    .slice(-40);
}

function createMaze(
  width: number,
  height: number,
  random: () => number
): LabyrinthCell[] {
  const cells: LabyrinthCell[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      cells.push({
        id: cellId(row, column),
        row,
        column,
        exits: [],
        kind: "path",
        floorVariant: Math.floor(random() * 3)
      });
    }
  }

  const start = getCell(cells, height - 1, 0)!;
  const visited = new Set<string>([start.id]);
  const stack = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;
    const options = shuffleWithRandom(
      (Object.keys(DELTAS) as LabyrinthDirection[])
        .map((direction) => {
          const delta = DELTAS[direction];
          return {
            direction,
            cell: getCell(cells, current.row + delta.row, current.column + delta.column)
          };
        })
        .filter((candidate): candidate is { direction: LabyrinthDirection; cell: LabyrinthCell } =>
          Boolean(candidate.cell && !visited.has(candidate.cell.id))
        ),
      random
    );

    const next = options[0];
    if (!next) {
      stack.pop();
      continue;
    }

    current.exits.push(next.direction);
    next.cell.exits.push(DELTAS[next.direction].opposite);
    visited.add(next.cell.id);
    stack.push(next.cell);
  }

  return cells;
}

function placeImmediateEvents(
  candidates: LabyrinthCell[],
  occupied: Set<string>,
  config: PackLabyrinthConfig,
  random: () => number
): void {
  const events = config.events;
  const cacheCount = clampInt(events?.cache_cells ?? 2, 0, 5);
  const healingCount = clampInt(events?.healing_cells ?? 1, 0, 3);
  const revealCount = clampInt(events?.reveal_cells ?? 1, 0, 3);
  const cacheMin = Math.max(0, Math.floor(events?.cache_coins_min ?? 2));
  const cacheMax = Math.max(cacheMin, Math.floor(events?.cache_coins_max ?? 6));

  const place = (kind: LabyrinthCellKind, count: number, offset: number): void => {
    for (let index = 0; index < count; index += 1) {
      const cell = pickUnusedCandidate(candidates, occupied, offset + index * 4);
      if (!cell) return;
      occupied.add(cell.id);
      cell.kind = kind;
      cell.eventVariant = index;
      if (kind === "cache") {
        cell.eventValue = cacheMin + Math.floor(random() * (cacheMax - cacheMin + 1));
      }
    }
  };

  place("cache", cacheCount, 7);
  place("healing", healingCount, 15);
  place("reveal", revealCount, 23);
}

function revealAround(
  cells: LabyrinthCell[],
  cellIdValue: string,
  revealed: Set<string>
): Set<string> {
  const cell = cells.find((candidate) => candidate.id === cellIdValue);
  if (!cell) return revealed;
  revealed.add(cell.id);
  for (const direction of cell.exits) {
    const delta = DELTAS[direction];
    const neighbor = getCell(cells, cell.row + delta.row, cell.column + delta.column);
    if (neighbor) revealed.add(neighbor.id);
  }
  return revealed;
}

function revealWithinRadius(
  cells: LabyrinthCell[],
  startId: string,
  revealed: Set<string>,
  radius: number
): Set<string> {
  const queue: Array<{ id: string; distance: number }> = [{ id: startId, distance: 0 }];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    revealed.add(current.id);
    if (current.distance >= radius) continue;
    const cell = cells.find((candidate) => candidate.id === current.id);
    if (!cell) continue;
    for (const direction of cell.exits) {
      const delta = DELTAS[direction];
      const neighbor = getCell(cells, cell.row + delta.row, cell.column + delta.column);
      if (neighbor && !visited.has(neighbor.id)) {
        queue.push({ id: neighbor.id, distance: current.distance + 1 });
      }
    }
  }
  return revealed;
}

function markCellResolved(cells: LabyrinthCell[], cellIdValue: string): LabyrinthCell[] {
  return cells.map((cell) => cell.id === cellIdValue ? { ...cell, resolved: true } : cell);
}

function areConnected(a: LabyrinthCell, b: LabyrinthCell): boolean {
  const rowDelta = b.row - a.row;
  const columnDelta = b.column - a.column;
  const direction = (Object.entries(DELTAS) as Array<[LabyrinthDirection, (typeof DELTAS)[LabyrinthDirection]]>)
    .find(([, delta]) => delta.row === rowDelta && delta.column === columnDelta)?.[0];
  return Boolean(direction && a.exits.includes(direction));
}

function getDistances(cells: LabyrinthCell[], startId: string): Map<string, number> {
  const distances = new Map<string, number>([[startId, 0]]);
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const cell = cells.find((candidate) => candidate.id === id);
    if (!cell) continue;
    const distance = distances.get(id) ?? 0;
    for (const direction of cell.exits) {
      const delta = DELTAS[direction];
      const neighbor = getCell(cells, cell.row + delta.row, cell.column + delta.column);
      if (!neighbor || distances.has(neighbor.id)) continue;
      distances.set(neighbor.id, distance + 1);
      queue.push(neighbor.id);
    }
  }
  return distances;
}

function pickUnusedCandidate(
  candidates: LabyrinthCell[],
  occupied: Set<string>,
  preferredIndex: number
): LabyrinthCell | undefined {
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(preferredIndex + offset) % candidates.length];
    if (candidate && !occupied.has(candidate.id)) return candidate;
  }
  return undefined;
}

function buildMixedFocuses(
  count: number,
  learnerState: LearnerState,
  random: () => number
): TrainingFocus[] {
  const statByFocus: Record<TrainingFocus, keyof LearnerState["hero_stats"]> = {
    vocabulary: "strength",
    comprehension: "defense",
    grammar: "precision",
    pronunciation: "stamina"
  };
  const statValues = LABYRINTH_FOCUSES.map(
    (focus) => learnerState.hero_stats[statByFocus[focus]]
  );
  const strongestStat = Math.max(1, ...statValues);
  const weightedFocuses = LABYRINTH_FOCUSES.flatMap((focus) => {
    const value = learnerState.hero_stats[statByFocus[focus]];
    const weight = Math.max(1, 1 + strongestStat - value);
    return Array.from({ length: weight }, () => focus);
  });

  return Array.from({ length: Math.max(1, count) }, () =>
    weightedFocuses[Math.floor(random() * weightedFocuses.length)] ?? "vocabulary"
  );
}

function distributeCount(total: number, buckets: number): number[] {
  const safeBuckets = Math.max(1, buckets);
  const values = Array.from({ length: safeBuckets }, () => Math.floor(total / safeBuckets));
  for (let index = 0; index < total % safeBuckets; index += 1) values[index] += 1;
  return values.map((value) => Math.max(1, value));
}

function getCell(
  cells: LabyrinthCell[],
  row: number,
  column: number
): LabyrinthCell | undefined {
  return cells.find((cell) => cell.row === row && cell.column === column);
}

function cellId(row: number, column: number): string {
  return `${row}:${column}`;
}

function shuffleWithRandom<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function clampInt(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function isLabyrinthCell(value: unknown): value is LabyrinthCell {
  if (!isObject(value)) return false;
  return typeof value.id === "string"
    && Number.isInteger(value.row)
    && Number.isInteger(value.column)
    && Array.isArray(value.exits)
    && value.exits.every((direction) => direction === "north" || direction === "east" || direction === "south" || direction === "west")
    && ["path", "entrance", "rune", "monster", "trap", "cache", "healing", "reveal", "treasure"].includes(String(value.kind));
}

function isLabyrinthEncounter(value: unknown): value is LabyrinthEncounterPlan {
  if (!isObject(value)) return false;
  return typeof value.id === "string"
    && typeof value.cellId === "string"
    && (value.kind === "rune" || value.kind === "monster" || value.kind === "trap" || value.kind === "guardian")
    && Array.isArray(value.focuses)
    && value.focuses.every(isTrainingFocus)
    && typeof value.completed === "boolean";
}

function isTrainingFocus(value: unknown): value is TrainingFocus {
  return value === "vocabulary" || value === "comprehension" || value === "grammar" || value === "pronunciation";
}

function focusArray(value: unknown): TrainingFocus[] {
  return Array.isArray(value) ? value.filter(isTrainingFocus) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function safeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : Math.floor(fallback);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
