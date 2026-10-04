import { Purchases, type PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { PRODUCT_ORDER, PRODUCTS, type ProductId } from '../data/shop';
import { MONETIZATION_CONFIG } from './config';

export type PurchaseResult = 'ok' | 'cancelled' | 'failed' | 'unavailable';

export interface StoreProduct {
  id: ProductId;
  /** Localized price from the store. */
  price: string;
}

/**
 * In-app purchases (GDD §12) behind an interface, so the game runs without a store. The game
 * grants contents itself after `purchase` resolves 'ok' (src/meta/shop.ts).
 */
export interface Iap {
  init(): Promise<void>;
  /** Products the store knows about; empty when offline or not configured. */
  products(): Promise<StoreProduct[]>;
  purchase(id: ProductId): Promise<PurchaseResult>;
  /** One-time products the account owns (Restore purchases). */
  restore(): Promise<ProductId[]>;
}

/** Web mock: every purchase succeeds after a short delay. */
export class MockIap implements Iap {
  private readonly owned = new Set<ProductId>();
  async init(): Promise<void> {}
  async products(): Promise<StoreProduct[]> {
    return PRODUCT_ORDER.map((id) => ({ id, price: PRODUCTS[id].fallbackPrice }));
  }
  async purchase(id: ProductId): Promise<PurchaseResult> {
    console.info(`[MockIap] purchase: ${id}`);
    await new Promise((r) => setTimeout(r, 300));
    if (PRODUCTS[id].oneTime) this.owned.add(id);
    return 'ok';
  }
  async restore(): Promise<ProductId[]> {
    return [...this.owned];
  }
}

/** RevenueCat on iOS (receipt validation is RevenueCat's). Disabled until an API key is set. */
export class RevenueCatIap implements Iap {
  private configured = false;
  private cache = new Map<ProductId, PurchasesStoreProduct>();

  async init(): Promise<void> {
    const apiKey = MONETIZATION_CONFIG.revenuecat.iosApiKey;
    if (!apiKey) return;
    try {
      await Purchases.configure({ apiKey });
      this.configured = true;
    } catch (e) {
      console.warn('[RevenueCat] configure failed', e);
    }
  }

  async products(): Promise<StoreProduct[]> {
    if (!this.configured) return [];
    try {
      const { products } = await Purchases.getProducts({ productIdentifiers: [...PRODUCT_ORDER] });
      for (const p of products) this.cache.set(p.identifier as ProductId, p);
      return products.map((p) => ({ id: p.identifier as ProductId, price: p.priceString }));
    } catch {
      return [];
    }
  }

  async purchase(id: ProductId): Promise<PurchaseResult> {
    if (!this.configured) return 'unavailable';
    if (!this.cache.has(id)) await this.products();
    const product = this.cache.get(id);
    if (!product) return 'unavailable';
    try {
      await Purchases.purchaseStoreProduct({ product });
      return 'ok';
    } catch (e) {
      return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'failed';
    }
  }

  async restore(): Promise<ProductId[]> {
    if (!this.configured) return [];
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const ids = new Set(customerInfo.nonSubscriptionTransactions.map((t) => t.productIdentifier));
      return PRODUCT_ORDER.filter((id) => PRODUCTS[id].oneTime && ids.has(id));
    } catch {
      return [];
    }
  }
}
