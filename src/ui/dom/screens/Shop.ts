import { PRODUCTS, type ProductDef, type ProductId } from '../../../data/shop';
import { owns } from '../../../meta/shop';
import type { MetaStore } from '../../../meta/store';
import type { PurchaseResult, StoreProduct } from '../../../platform/iap';
import { icon } from '../icons';
import { fmt, h } from '../overlay';

export interface ShopActions {
  back(): void;
  products(): Promise<StoreProduct[]>;
  purchase(id: ProductId): Promise<PurchaseResult>;
  restore(): Promise<ProductId[]>;
}

const CORE_PACKS: ProductId[] = ['cores_s', 'cores_m', 'cores_l'];
const SHARD_PACKS: ProductId[] = ['shards_s', 'shards_m'];

/**
 * Shop (GDD §12). No mockup yet; built from the design system. Commander Pass and the Starter
 * Pack are featured cards; Core and Shard packs are tiles. Prices come from the store; with no
 * store (offline, not configured) every buy button says so and nothing breaks.
 */
export class Shop {
  readonly el: HTMLElement;
  private prices = new Map<ProductId, string>();
  private loading = true;
  private busy: ProductId | 'restore' | null = null;
  private note = '';

  constructor(
    parent: HTMLElement,
    private readonly store: MetaStore,
    private readonly actions: ShopActions,
  ) {
    this.el = h('section', 'screen pad shop');
    this.el.addEventListener('click', (e) => this.onClick(e));
    parent.appendChild(this.el);
    this.render();
    void actions.products().then((list) => {
      this.prices = new Map(list.map((p) => [p.id, p.price]));
      this.loading = false;
      this.render();
    });
  }

  destroy(): void {
    this.el.remove();
  }

  private onClick(e: MouseEvent): void {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || (t as HTMLButtonElement).disabled || this.busy) return;
    const [act, arg] = (t.dataset.act ?? '').split(':');
    if (act === 'back') this.actions.back();
    else if (act === 'buy') void this.buy(arg as ProductId);
    else if (act === 'restore') void this.restore();
  }

  private async buy(id: ProductId): Promise<void> {
    this.busy = id;
    this.note = '';
    this.render();
    const result = await this.actions.purchase(id);
    this.busy = null;
    this.note =
      result === 'ok'
        ? `${PRODUCTS[id].name}: thank you! Added to your account.`
        : result === 'cancelled'
          ? ''
          : result === 'unavailable'
            ? 'The store is unavailable right now. Try again later.'
            : "The purchase didn't go through. You were not charged.";
    this.render();
  }

  private async restore(): Promise<void> {
    this.busy = 'restore';
    this.render();
    const ids = await this.actions.restore();
    this.busy = null;
    this.note = ids.length
      ? `Restored: ${ids.map((id) => PRODUCTS[id].name).join(', ')}.`
      : 'Nothing to restore.';
    this.render();
  }

  private priceButton(d: ProductDef, primary: boolean): string {
    const p = this.store.profile;
    if (d.oneTime && owns(p, d.id)) {
      return `<div class="r-max" style="width:auto;height:48px;flex:1">${icon.checkCircle(20)}<span class="btn-md-text">Owned</span></div>`;
    }
    const price = this.prices.get(d.id);
    const label =
      this.busy === d.id
        ? 'Processing…'
        : (price ?? (this.loading ? 'Loading…' : 'Store unavailable'));
    const disabled = !price || this.busy !== null;
    return primary
      ? `<button class="btn-primary btn-lg-text" data-act="buy:${d.id}" ${disabled ? 'disabled' : ''} style="height:56px;flex:1" aria-label="Buy ${d.name} for ${price ?? ''}">${label}</button>`
      : `<button class="btn-secondary" data-act="buy:${d.id}" ${disabled ? 'disabled' : ''} style="height:44px;width:100%" aria-label="Buy ${d.name} for ${price ?? ''}"><span class="inner btn-md-text">${label}</span></button>`;
  }

  private pack(id: ProductId): string {
    const d = PRODUCTS[id];
    const cur = d.cores ? icon.cores(28) : icon.shards(28);
    const n = d.cores ?? d.shards ?? 0;
    return `<div class="shop-pack">${cur}<span class="d" style="font-size:22px;line-height:26px;font-weight:700">${fmt.int(n)}</span><span class="caption muted">${d.name}</span>${this.priceButton(d, false)}</div>`;
  }

  private render(): void {
    const p = this.store.profile;
    const pass = PRODUCTS.commander_pass;
    const starter = PRODUCTS.starter_pack;
    const scroll = this.el.querySelector('.shop-scroll')?.scrollTop ?? 0;
    this.el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn-sq" data-act="back" aria-label="Back"><span class="inner">${icon.back()}</span></button>
          <h1 class="d title-lg">Shop</h1>
        </div>
        <div style="display:flex;gap:6px">
          <div class="chip-cur">${icon.cores()}<span class="d">${fmt.int(p.cores)}</span></div>
          <div class="chip-cur">${icon.shards()}<span class="d">${fmt.int(p.shards)}</span></div>
        </div>
      </div>
      <div class="shop-scroll">
        <div class="shop-feature pass">
          <span class="label" style="color:var(--credits)">Best value</span>
          <span class="d" style="font-size:24px;line-height:28px;font-weight:700;text-transform:uppercase">${pass.name}</span>
          <span class="caption" style="font-size:16px;line-height:22px">${pass.blurb}</span>
          <div style="display:flex">${this.priceButton(pass, true)}</div>
        </div>
        ${
          owns(p, 'starter_pack')
            ? ''
            : `<div class="shop-feature">
                 <span class="d" style="font-size:20px;line-height:24px;font-weight:700;text-transform:uppercase">${starter.name}</span>
                 <span class="caption" style="font-size:16px;line-height:22px">${starter.blurb}</span>
                 <div style="display:flex">${this.priceButton(starter, false)}</div>
               </div>`
        }
        <span class="label muted">Cores</span>
        <div class="shop-grid three">${CORE_PACKS.map((id) => this.pack(id)).join('')}</div>
        <span class="label muted">Shards</span>
        <div class="shop-grid">${SHARD_PACKS.map((id) => this.pack(id)).join('')}</div>
        ${this.note ? `<span class="caption" style="text-align:center;color:var(--accent)">${this.note}</span>` : ''}
        <button class="btn-secondary" data-act="restore" ${this.busy ? 'disabled' : ''} style="height:48px"><span class="inner btn-md-text">${this.busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</span></button>
        <span class="caption muted" style="text-align:center">Ads are always optional. No purchase is needed to reach any wave.</span>
      </div>`;
    const el = this.el.querySelector('.shop-scroll');
    if (el) el.scrollTop = scroll;
  }
}
