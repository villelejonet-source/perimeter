export type ProductId = 'commander_pass' | 'starter_pack' | 'cores_small' | 'shards_small';

export interface Product {
  id: ProductId;
  title: string;
  price: string;
}

export interface Iap {
  products(): Promise<Product[]>;
  purchase(id: ProductId): Promise<boolean>;
  restore(): Promise<ProductId[]>;
}

/** Web mock: every purchase succeeds; non-consumables are remembered for the session. */
export class MockIap implements Iap {
  private readonly owned = new Set<ProductId>();
  async products(): Promise<Product[]> {
    return [
      { id: 'commander_pass', title: 'Commander Pass', price: '$4.99' },
      { id: 'starter_pack', title: 'Starter Pack', price: '$1.99' },
      { id: 'cores_small', title: 'Core Pack', price: '$0.99' },
      { id: 'shards_small', title: 'Shard Pack', price: '$0.99' },
    ];
  }
  async purchase(id: ProductId): Promise<boolean> {
    console.info(`[MockIap] purchase: ${id}`);
    await new Promise((r) => setTimeout(r, 300));
    if (id === 'commander_pass' || id === 'starter_pack') this.owned.add(id);
    return true;
  }
  async restore(): Promise<ProductId[]> {
    return [...this.owned];
  }
}
