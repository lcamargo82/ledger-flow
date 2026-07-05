import { SetMetadata } from '@nestjs/common';

export const IS_PLATFORM_ADMIN_ONLY_KEY = 'isPlatformAdminOnly';
export const PlatformAdminOnly = () => SetMetadata(IS_PLATFORM_ADMIN_ONLY_KEY, true);
