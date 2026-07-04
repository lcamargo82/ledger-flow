import { Injectable } from '@nestjs/common';
import { ChannelProvider } from '@prisma/client';
import {
  ChannelListingImportAdapter,
  ChannelListingImportInput,
  ChannelListingImportItem,
  ChannelProviderAdapter,
  ChannelProviderCapabilities,
} from '../../domain/interfaces/channel-provider-adapter.interface';
import {
  MercadoLivreApiClient,
  MercadoLivreItemResponse,
} from '../clients/mercado-livre-api.client';

@Injectable()
export class MercadoLivreChannelAdapter implements ChannelListingImportAdapter {
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
}
