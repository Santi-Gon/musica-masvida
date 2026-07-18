export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AdminUser;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN';
}
