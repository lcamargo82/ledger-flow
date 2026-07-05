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
  ChannelProviderAdapter,
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
    const pageSize = input.pageSize ?? 50;
    const maxPages = input.maxPages ?? 5;
    const listings: ChannelListingImportItem[] = [];
    let offset = 0;

    for (let page = 0; page < maxPages; page += 1) {
      const search = await this.apiClient.searchSellerItems({
        accessToken: input.accessToken,
        sellerId: input.externalAccountId,
        offset,
        limit: pageSize,
      });

      for (const itemId of search.results) {
        const item = await this.apiClient.getItem(input.accessToken, itemId);
        listings.push(this.toListing(item));
      }

      offset += search.paging.limit;
      if (offset >= search.paging.total || search.results.length === 0) break;
    }

    return listings;
  }

  async fetchOrder(input: {
    accessToken: string;
    resource: string;
  }): Promise<ChannelOrderDetails> {
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
}
