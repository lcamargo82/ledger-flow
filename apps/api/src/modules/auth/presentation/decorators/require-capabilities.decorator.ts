import { SetMetadata } from '@nestjs/common';
import type { CommerceCapability } from '../../../platform/domain/constants/platform-capabilities';

export const REQUIRED_CAPABILITIES_KEY = 'requiredCapabilities';
export const RequireCapabilities = (...capabilities: CommerceCapability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, capabilities);
