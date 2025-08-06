export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode: string;
  personalChannelId: string;
  createdAt: Date;
  lastActiveAt: Date;
  churnRisk: number;
  lifetimeValue: number;
  isActive: boolean;
}

export interface CreateUserRequest {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  lastActiveAt?: Date;
  churnRisk?: number;
  lifetimeValue?: number;
  isActive?: boolean;
}