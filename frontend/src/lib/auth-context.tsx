'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  /** Check if the current user has a specific permission */
  hasPermission: (resource: string, scope?: string) => boolean;
  /** Check if the current user has one of the given roles */
  hasRole: (...roles: string[]) => boolean;
  /** Refresh user info from the server */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Auth failed: ${res.status}`);
      }
      const data: AuthUser = await res.json();
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
      setError(err instanceof Error ? err.message : 'Auth error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const hasPermission = useCallback(
    (resource: string, scope: string = 'read'): boolean => {
      if (!user) return false;
      const perms = user.permissions;
      // Wildcard admin
      if (perms.includes('*:*')) return true;
      // Exact match
      if (perms.includes(`${resource}:${scope}`)) return true;
      // Resource wildcard
      if (perms.includes(`${resource}:*`)) return true;
      return false;
    },
    [user]
  );

  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        hasPermission,
        hasRole,
        refresh: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

/**
 * Convenience hook — check a single permission.
 *
 * Usage:
 *   const canEdit = usePermission('ea_request', 'write');
 */
export function usePermission(resource: string, scope: string = 'read'): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(resource, scope);
}
