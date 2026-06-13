import { AuthenticatedUser } from './authenticated-user.type';

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
};
