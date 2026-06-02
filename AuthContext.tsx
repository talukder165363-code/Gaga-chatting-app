import React, { useState, useCallback, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import { AuthContext, type AuthResult, type User } from './auth-context';

const mapFirebaseUser = (fbUser: FirebaseAuthUser | null): User | null => {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Guest',
    email: fbUser.email || 'unknown@example.com',
    avatar: fbUser.photoURL || '/logo.jpg',
    coins: 0, // real value loaded from Firestore via useProfile
    emailVerified: fbUser.emailVerified ?? false,
  };
};


export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(mapFirebaseUser(fbUser));
      setLoading(false);
    });
    return () => unsub();
  }, []);



  /*
  const getFirebaseAuthErrorMessage = (error: unknown): string => {

    if (error instanceof Error) {
      const message = error.message;
      const errorWithCode = error as Error & { code?: string };
      if ('code' in error && typeof errorWithCode.code === 'string') {
        switch (errorWithCode.code) {
          case 'auth/email-already-in-use':
            return 'This email is already in use. Please use another email or sign in.';
          case 'auth/invalid-email':
            return 'The email address is invalid. Please enter a valid email.';
          case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
          case 'auth/user-not-found':
            return 'No account found with this email address.';
          case 'auth/weak-password':
            return 'Password is too weak. Please choose a stronger password.';
          case 'auth/operation-not-allowed':
            return 'Email/password sign-in is not enabled in Firebase Auth.';
          case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
          default:
            return message;
        }
      }
      return message;
    }
    return 'An unexpected error occurred. Please try again.';
  };
  */


  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setUser(mapFirebaseUser(res.user));
      setLoading(false);
      return { success: true };
    } catch (err) {
      const error = err as Error & { code?: string };
      return { success: false, error: error.message || 'Sign in failed. Please try again.' };
    }
  }, []);



  const signup = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user) {
        if (name) await updateProfile(res.user, { displayName: name });
        await sendEmailVerification(res.user);
      }
      setUser(mapFirebaseUser(res.user));
      setLoading(false);
      return { success: true };
    } catch (err) {
      const error = err as Error & { code?: string };
      return { success: false, error: error.message || 'Sign up failed. Please try again.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    return signup(displayName || email.split('@')[0], email, password);
  }, [signup]);


  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      setUser(mapFirebaseUser(res.user));
      setLoading(false);
      return { success: true };
    } catch (err) {
      const error = err as Error & { code?: string };
      // User closed the popup — treat as cancelled, not an error to surface
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return { success: false, error: '' };
      }
      return { success: false, error: error.message || 'Google sign-in failed. Please try again.' };
    }
  }, []);


  const logout = useCallback(async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
  }, []);


  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err) {
      console.warn('resetPassword error', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send reset email. Please try again.',
      };
    }
  }, []);

  const resendVerification = useCallback(async (): Promise<AuthResult> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No authenticated user found to resend verification.' };
      }
      await sendEmailVerification(currentUser);
      return { success: true };
    } catch (err) {
      console.warn('resendVerification error', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resend verification email. Please try again.',
      };
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthResult> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No authenticated user session found.' };
      }
      await currentUser.reload();
      setUser(mapFirebaseUser(auth.currentUser));
      return { success: true };
    } catch (err) {
      console.warn('refreshUser error', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to refresh user status. Please try again.',
      };
    }
  }, []);

  const addCoins = useCallback((amount: number) => {
    setUser((current) =>
      current
        ? { ...current, coins: (current.coins ?? 0) + amount }
        : current
    );
  }, []);

  const spendCoins = useCallback((amount: number) => {
    setUser((current) =>
      current
        ? { ...current, coins: Math.max(0, (current.coins ?? 0) - amount) }
        : current
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        // core
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        signOut: logout,
        addCoins,
        spendCoins,
        // legacy aliases
        session: user,
        signIn: login,
        signInWithGoogle: loginWithGoogle,
        signUp,
        resetPassword,
        resendVerification,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

