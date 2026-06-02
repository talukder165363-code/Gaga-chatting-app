import { createContext } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  coins?: number;
  emailVerified?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  errorMessage?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => void;
}

export interface LegacyAuthContextType extends AuthContextType {
  session: User | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  resendVerification: (email?: string) => Promise<AuthResult>;
  refreshUser: () => Promise<AuthResult>;
}

export const AuthContext = createContext<LegacyAuthContextType | undefined>(undefined);
