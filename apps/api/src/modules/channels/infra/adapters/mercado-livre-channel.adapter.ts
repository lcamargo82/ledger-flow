import { Injectable } from '@nestjs/common';
import { ChannelProvider } from '@prisma/client';
import {
  ChannelListingImportAdapter,
  ChannelListingImportInput,
  ChannelListingImportItem,
  ChannelInventorySyncAdapter,
  ChannelInventoryUpdateInput,
  ChannelInventoryUpdateResult,
  ChannelOrderAdapter,
  ChannelOrderDetails,
  ChannelProviderCapabilities,
} from '../../domain/interfaces/channel-provider-adapter.interface';
import {
  MercadoLivreApiClient,
  MercadoLivreItemResponse,
  MercadoLivreOrderResponse,
} from '../clients/mercado-livre-api.client';

@Injectable()
export class MercadoLivreChannelAdapter
  implements ChannelListingImportAdapter, ChannelOrderAdapter, ChannelInventorySyncAdapter
{
  readonly provider = ChannelProvider.MERCADO_LIVRE;

  readonly capabilities: ChannelProviderCapabilities = {
    oauth: true,
    listingImport: true,
    webhooks: true,
    inventorySync: true,
    orderIntake: true,
  };

  constructor(private readonly apiClient: MercadoLivreApiClient) {}

  async fetchListings(input: ChannelListingImportInput): Promise<ChannelListingImportItem[]> {
    const pageSize = input.pageSize ?? 100;
    const maxPages = input.maxPages;
    const listings: ChannelListingImportItem[] = [];
    const seenItemIds = new Set<string>();
    let scrollId: string | undefined;
    let page = 0;

    while (maxPages === undefined || page < maxPages) {
      const search = await this.apiClient.searchSellerItems({
        accessToken: input.accessToken,
        sellerId: input.externalAccountId,
        limit: pageSize,
        searchType: 'scan',
        ...(scrollId && { scrollId }),
      });
      const itemIds = search.results.filter((itemId) => {
        if (seenItemIds.has(itemId)) return false;
        seenItemIds.add(itemId);
        return true;
      });

      if (itemIds.length === 0) break;

      const detailConcurrency = 10;
      for (let index = 0; index < itemIds.length; index += detailConcurrency) {
        const batch = itemIds.slice(index, index + detailConcurrency);
        const items = await Promise.all(
          batch.map((itemId) => this.apiClient.getItem(input.accessToken, itemId)),
        );
        listings.push(...items.map((item) => this.toListing(item)));
      }

      page += 1;
      const nextScrollId = search.scroll_id?.trim();
      if (!nextScrollId) break;
      scrollId = nextScrollId;
    }

    return listings;
  }

  async fetchOrder(input: { accessToken: string; resource: string }): Promise<ChannelOrderDetails> {
    return this.toOrder(await this.apiClient.getOrder(input.accessToken, input.resource));
  }

  async updateListingStock(
    input: ChannelInventoryUpdateInput,
  ): Promise<ChannelInventoryUpdateResult> {
    try {
      const result = await this.apiClient.updateItemStock(input);
      return {
        ok: true,
        providerStatus: result.status ?? 'updated',
        externalListingId: result.id,
        availableQuantity: Number(result.available_quantity ?? input.availableQuantity),
      };
    } catch (error) {
      const providerError = error as Error & {
        status?: number;
        retryAfterSeconds?: number;
      };
      return {
        ok: false,
        errorCode: providerError.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR',
        errorSummary:
          providerError.status === 429
            ? 'Mercado Livre returned 429.'
            : 'Mercado Livre stock update failed.',
        ...(providerError.retryAfterSeconds && {
          retryAfterSeconds: providerError.retryAfterSeconds,
        }),
      };
    }
  }

  private toListing(item: MercadoLivreItemResponse): ChannelListingImportItem {
    const thumbnailUrl = item.secure_thumbnail ?? item.thumbnail;

    return {
      externalListingId: item.id,
      title: item.title ?? item.id,
      externalSku: this.resolveSku(item),
      metadata: {
        ...(item.status && { providerStatus: item.status }),
        ...(thumbnailUrl && { thumbnailUrl }),
      },
    };
  }

  private resolveSku(item: MercadoLivreItemResponse) {
    if (item.seller_custom_field?.trim()) return item.seller_custom_field.trim();

    const sellerSku = item.attributes?.find((attribute) => {
      const id = attribute.id?.toUpperCase();
      const name = attribute.name?.toUpperCase();
      return id === 'SELLER_SKU' || id === 'SELLER_CUSTOM_FIELD' || name === 'SKU';
    });

    return sellerSku?.value_name?.trim() || undefined;
  }

  private toOrder(order: MercadoLivreOrderResponse): ChannelOrderDetails {
    return {
      externalOrderId: String(order.id),
      status: order.status ?? 'unknown',
      buyerName: this.resolveBuyerName(order),
      financial: this.resolveFinancial(order),
      shipping: this.resolveShipping(order),
      items: (order.order_items ?? [])
        .map((orderItem) => ({
          externalListingId: orderItem.item?.id?.trim() ?? '',
          title: orderItem.item?.title,
          quantity: Number(orderItem.quantity ?? 0),
        }))
        .filter((item) => item.externalListingId && item.quantity > 0),
    };
  }

  private resolveBuyerName(order: MercadoLivreOrderResponse) {
    const buyer = order.buyer;
    if (!buyer) return undefined;

    const fullName = [buyer.first_name, buyer.last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim();

    return fullName || buyer.nickname?.trim() || undefined;
  }

  private resolveFinancial(order: MercadoLivreOrderResponse) {
    const channelFeeAmount = this.sum(
      (order.order_items ?? []).map((item) => item.sale_fee),
      (order.payments ?? []).map((payment) => payment.marketplace_fee),
    );
    const freightAmount =
      this.money(order.shipping_cost) ??
      this.firstMoney((order.payments ?? []).map((payment) => payment.shipping_cost));
    const paidAmount =
      this.money(order.paid_amount) ??
      this.firstMoney((order.payments ?? []).map((payment) => payment.total_paid_amount));
    const revenueAmount =
      this.money(order.total_amount) ??
      this.firstMoney((order.payments ?? []).map((payment) => payment.transaction_amount)) ??
      paidAmount;
    const discountAmount = this.money(order.coupon?.amount);
    const paymentStatus =
      (order.payments ?? []).map((payment) => payment.status?.trim()).find(Boolean) ?? order.status;
    const soldAt = this.isoDate(order.date_created);
    const estimatedNetAmount = this.subtractMoney(paidAmount ?? revenueAmount, channelFeeAmount);

    const financial = {
      ...(order.currency_id && { currency: order.currency_id }),
      ...(paymentStatus && { paymentStatus }),
      ...(soldAt && { soldAt }),
      ...(revenueAmount && { revenueAmount }),
      ...(paidAmount && { paidAmount }),
      ...(channelFeeAmount && { channelFeeAmount }),
      ...(estimatedNetAmount && { estimatedNetAmount }),
      ...(freightAmount && { freightAmount }),
      ...(discountAmount && { discountAmount }),
    };

    return Object.keys(financial).length > 0 ? financial : undefined;
  }

  private resolveShipping(order: MercadoLivreOrderResponse) {
    const shipping = order.shipping;
    if (!shipping?.id) return undefined;

    const summary = {
      externalShipmentId: String(shipping.id),
      ...(shipping.status && { status: shipping.status }),
      ...(shipping.substatus && { substatus: shipping.substatus }),
      ...(shipping.mode && { shippingMode: shipping.mode }),
      ...(shipping.logistic_type && { logisticType: shipping.logistic_type }),
      ...(this.isoDate(shipping.date_handling) && {
        handlingEstimateAt: this.isoDate(shipping.date_handling),
      }),
      ...(this.isoDate(shipping.estimated_delivery?.date) && {
        deliveryEstimateAt: this.isoDate(shipping.estimated_delivery?.date),
      }),
      ...(this.isoDate(shipping.date_delivered) && {
        postedAt: this.isoDate(shipping.date_delivered),
      }),
      ...(this.maskTracking(shipping.tracking_number) && {
        trackingCodeMasked: this.maskTracking(shipping.tracking_number),
      }),
      source: 'MERCADO_LIVRE_ORDER',
      confidence: shipping.status || shipping.estimated_delivery?.date ? 0.7 : 0.4,
    };

    return summary;
  }

  private sum(...groups: Array<Array<number | string | undefined>>) {
    const values = groups
      .flat()
      .map((value) => this.money(value))
      .filter(Boolean);
    if (values.length === 0) return undefined;

    const total = values.reduce((sum, value) => sum + Number(value), 0);
    return this.money(total);
  }

  private firstMoney(values: Array<number | string | undefined>) {
    return values.map((value) => this.money(value)).find(Boolean);
  }

  private subtractMoney(amount: string | undefined, fee: string | undefined) {
    if (!amount || fee === undefined) return undefined;
    const amountMinor = Math.round(Number(amount) * 100);
    const feeMinor = Math.round(Number(fee ?? 0) * 100);
    return this.money((amountMinor - feeMinor) / 100);
  }

  private money(value: number | string | undefined) {
    if (value === undefined || value === null || value === '') return undefined;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return undefined;
    return String(amount);
  }

  private isoDate(value: string | undefined) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private maskTracking(value: string | undefined) {
    const tracking = value?.trim();
    if (!tracking) return undefined;
    if (tracking.length <= 4) return '****';
    return `${'*'.repeat(Math.max(4, tracking.length - 4))}${tracking.slice(-4)}`;
  }
}
