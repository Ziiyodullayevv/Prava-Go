import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase";
import { useTheoryOfflineSync } from "@/features/theory/hooks/useTheoryOfflineSync";

type AuthContextValue = {
	session: Session | null;
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	accessToken: string | null;
	refreshSession: () => Promise<void>;
	signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	useTheoryOfflineSync(session?.user?.id);

	const refreshSession = async () => {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.auth.getSession();
		if (error) {
			setSession(null);
			throw error;
		}

		setSession(data.session ?? null);
	};

	const signOut = async () => {
		const supabase = getSupabaseClient();
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	};

	useEffect(() => {
		let isMounted = true;
		const supabase = getSupabaseClient();

		const init = async () => {
			try {
				const { data, error } = await supabase.auth.getSession();
				if (!isMounted) return;

				if (error) {
					setSession(null);
					return;
				}

				setSession(data.session ?? null);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			if (!isMounted) return;
			setSession(nextSession ?? null);
			setIsLoading(false);
		});

		init().catch(() => {
			if (isMounted) {
				setSession(null);
				setIsLoading(false);
			}
		});

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			session,
			user: session?.user ?? null,
			isLoading,
			isAuthenticated: Boolean(session),
			accessToken: session?.access_token ?? null,
			refreshSession,
			signOut,
		}),
		[session, isLoading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
}
