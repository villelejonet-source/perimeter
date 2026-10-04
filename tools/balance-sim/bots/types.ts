import type { SpecId } from '../../../src/data/specs';
import type { TowerKind } from '../../../src/data/towers';
import type { Command } from '../../../src/sim/commands';
import type { Sim } from '../../../src/sim/sim';
import type { Tower } from '../../../src/sim/state';
import type { SpotIndex } from '../spots';

/** What a bot sees and can do. Bots act only through commands, like a player. */
export interface BotContext {
  sim: Sim;
  spots: SpotIndex;
  send(cmd: Command): void;
}

export interface Bot {
  readonly name: string;
  /** Called a few times per second of game time. */
  decide(ctx: BotContext): void;
}

/** How a bot picks specializations at level 5: a fixed option (0/1/2) or by estimated value. */
export type SpecChoice = 0 | 1 | 2 | 'best' | 'varied';

export type { SpecId, Tower, TowerKind };
