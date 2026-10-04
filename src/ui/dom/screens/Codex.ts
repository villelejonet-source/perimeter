import {
  ARTIFACT_ORDER,
  ARTIFACTS,
  artifactValue,
  craftCost,
  entryTier,
  TIER_NAMES,
  type ArtifactId,
  type ArtifactTier,
} from '../../../data/artifacts';
import { artifactTier, craftBlock } from '../../../meta/artifacts';
import type { MetaStore } from '../../../meta/store';
import { artifactIcon, TIER_COLOR, tierFrame, tierPips } from '../artifactArt';
import { C, icon } from '../icons';
import { fmt, h } from '../overlay';

/**
 * Artifact Codex (meta/Codex.dc.html): every artifact as a tile (crafted at its tier, or
 * hatched "Not crafted"), and a detail sheet for the selected one: Now / Next tier and the
 * craft or upgrade button priced in Shards. Crafting puts an artifact in the post-boss draw
 * pool; re-crafting raises its tier (GDD §9).
 */
export class Codex {
  readonly el: HTMLElement;
  private selected: ArtifactId;
  private readonly grid: HTMLElement;
  private readonly head: HTMLElement;
  private readonly sheet: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly store: MetaStore,
    private readonly onBack: () => void,
  ) {
    this.selected = ARTIFACT_ORDER[0]!;
    this.el = h('section', 'screen codex');
    const top = h('div', 'codex-top');
    this.head = h('div');
    this.grid = h('div', 'codex-grid');
    top.append(this.head, this.grid);
    this.sheet = h('div', 'codex-sheet');
    this.el.append(top, this.sheet);
    this.el.addEventListener('click', (e) => this.onClick(e));
    parent.appendChild(this.el);
    this.render();
  }

  destroy(): void {
    this.el.remove();
  }

  private onClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const [act, arg] = (target.dataset.act ?? '').split(':');
    if (act === 'back') return this.onBack();
    if (act === 'pick') this.selected = arg as ArtifactId;
    else if (act === 'craft') this.store.craft(this.selected);
    this.render();
  }

  private render(): void {
    const p = this.store.profile;
    const crafted = ARTIFACT_ORDER.filter((id) => artifactTier(p, id) !== undefined).length;
    this.head.innerHTML = `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="display:flex;flex-direction:column">
          <h1 class="d title-lg">Artifact Codex</h1>
          <span class="caption muted"><span class="d" style="color:var(--ink);font-weight:600">${crafted} / ${ARTIFACT_ORDER.length}</span> crafted · in your draw pool</span>
        </div>
        <div class="chip-cur">${icon.shards()}<span class="d">${fmt.int(p.shards)}</span></div>
      </div>`;
    const scroll = this.grid.scrollTop;
    this.grid.innerHTML = ARTIFACT_ORDER.map((id) => this.tile(id)).join('');
    this.grid.scrollTop = scroll;
    this.sheet.innerHTML = this.detail(this.selected);
  }

  private tile(id: ArtifactId): string {
    const tier = artifactTier(this.store.profile, id);
    const def = ARTIFACTS[id];
    const sel = id === this.selected;
    const label = `${def.name}, ${tier === undefined ? 'not crafted' : TIER_NAMES[tier]}`;
    if (tier === undefined) {
      return `<button class="codex-tile none ${sel ? 'selected' : ''}" data-act="pick:${id}" aria-pressed="${sel}" aria-label="${label}">
        <span class="tile">${artifactIcon(id, 0, 32, false)}<span class="tname" style="color:var(--ink-muted)">${def.name}</span><span class="label muted">Not crafted</span></span></button>`;
    }
    return `<div class="codex-tile glow${tier} ${sel ? 'selected' : ''}"><button data-act="pick:${id}" aria-pressed="${sel}" aria-label="${label}">${tierFrame(
      tier,
      `${artifactIcon(id, tier, 32)}<span class="tname">${def.name}</span>${tierPips(tier, false)}`,
      'tile',
    )}</button></div>`;
  }

  private detail(id: ArtifactId): string {
    const p = this.store.profile;
    const def = ARTIFACTS[id];
    const tier = artifactTier(p, id);
    const cost = craftCost(id, tier);
    const block = craftBlock(p, id);
    const next: ArtifactTier | null =
      tier === undefined ? entryTier(id) : cost === null ? null : ((tier + 1) as ArtifactTier);
    const tierRow = (t: ArtifactTier, label: string, framed: boolean): string => {
      const inner = `<span style="display:flex;align-items:center;gap:4px"><span class="label muted" style="margin-right:4px">${label}</span>${tierPips(t)}</span>
        <span class="desc">${def.describe(artifactValue(id, t))}</span>`;
      return framed
        ? `<div class="codex-row framed" style="background:${TIER_COLOR[t]}"><div class="codex-row">${inner}</div></div>`
        : `<div class="codex-row">${inner}</div>`;
    };
    const status =
      tier === undefined
        ? `<span class="caption muted">Not crafted · craft to add it to your draw pool</span>`
        : `<span class="caption muted" style="display:flex;align-items:center;gap:6px">${icon.checkCircle(16)}Crafted · in draw pool</span>`;
    const rows =
      (tier !== undefined ? tierRow(tier, 'Now', false) : '') +
      (next !== null ? tierRow(next, tier === undefined ? 'Craft' : 'Next', true) : '');
    const verb =
      tier === undefined ? 'Craft' : `Upgrade to ${next !== null ? TIER_NAMES[next] : ''}`;
    const need = block === 'shards' && cost !== null ? cost - p.shards : 0;
    const button =
      cost === null
        ? `<div class="r-max" style="flex:1;width:auto;height:56px">${icon.checkCircle(20)}<span class="btn-md-text">${TIER_NAMES[tier!]} · Max</span></div>`
        : `<button class="btn-primary btn-lg-text craft" data-act="craft" ${block ? 'disabled' : ''} aria-label="${verb} for ${cost} Shards">
            ${verb}<span style="display:flex;align-items:center;gap:4px">${icon.shards(18, block ? C.inkFaint : C.onAccent)}<span class="d">${cost}</span></span>
          </button>`;
    return `<div style="display:flex;align-items:center;gap:12px">
        ${artifactIcon(id, tier ?? entryTier(id), 48, tier !== undefined)}
        <div style="flex:1;display:flex;flex-direction:column"><span class="name">${def.name}</span>${status}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">${rows}</div>
      ${need ? `<span class="caption muted" style="text-align:right">Need ${need} more Shards</span>` : ''}
      <div style="display:flex;gap:8px">
        <button class="btn-sq" data-act="back" aria-label="Back to menu" style="width:56px;height:56px"><span class="inner">${icon.back()}</span></button>
        ${button}
      </div>`;
  }
}
