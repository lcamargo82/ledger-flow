import { SetMetadata } from '@nestjs/common';
import type { PlatformCapability } from '../../../platform/domain/constants/platform-capabilities';

export const REQUIRED_CAPABILITIES_KEY = 'requiredCapabilities';
export const RequireCapabilities = (...capabilities: PlatformCapability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, capabilities);
