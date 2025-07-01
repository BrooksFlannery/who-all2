import { authClient } from '@/lib/auth-client';
import { createContext, useContext, useEffect, useState } from 'react';

type User = {
    id: string;
    email: string;
    name?: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated
        const checkAuth = async () => {
            try {
                const session = await authClient.getSession();
                if (session && 'user' in session && session.user) {
                    const sessionUser = session.user as any;
                    setUser({
                        id: sessionUser.id,
                        email: sessionUser.email,
                        name: sessionUser.name
                    });
                } else {
                    setUser(null);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {

            const res: any = await authClient.signIn.email({ email, password });

            const { data, error } = res ?? {};

            const usr =
                data?.user ??
                data?.session?.user ??
                res?.user ??
                res?.session?.user;


            if (!usr) {
                throw new Error(error?.message || 'Sign in failed');
            }

            setUser({ id: usr.id, email: usr.email, name: usr.name });
        } catch (error) {
            throw error;
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        try {
            const res: any = await authClient.signUp.email({ email, password, name });

            const { data, error } = res ?? {};

            const usr =
                data?.user ??
                data?.session?.user ??
                res?.user ??
                res?.session?.user;

            if (!usr) {
                throw new Error(error?.message || 'Sign up failed');
            }

            setUser({ id: usr.id, email: usr.email, name: usr.name });
        } catch (error) {
            console.error('Sign up failed:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await authClient.signOut();
            setUser(null);
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
