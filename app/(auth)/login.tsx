import React from "react";
import { Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Mail } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { Image } from "@/components/ui/image";
import { AuthErrorModal } from "@/components/auth/AuthErrorModal";
import { getSupabaseClient } from "@/lib/supabase";
import { getFriendlyAuthError } from "@/lib/auth-error";
import {
	applySessionFromOAuthCallback,
	getOAuthRedirectTo,
} from "@/lib/oauth-callback";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;
	const [googleLoading, setGoogleLoading] = React.useState(false);
	const [errorModal, setErrorModal] = React.useState<{
		isOpen: boolean;
		title: string;
		message: string;
	}>({
		isOpen: false,
		title: "",
		message: "",
	});

	const handleGoogleContinue = async () => {
		if (googleLoading) return;

		setGoogleLoading(true);
		try {
			const redirectTo = getOAuthRedirectTo();
			const supabase = getSupabaseClient();
			if (Platform.OS === "web") {
				const { error } = await supabase.auth.signInWithOAuth({
					provider: "google",
					options: { redirectTo },
				});
				if (error) throw error;
				return;
			}

			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo,
					skipBrowserRedirect: true,
				},
			});
			if (error) throw error;
			if (!data?.url) throw new Error("Google auth URL olinmadi.");

			const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
			if (res.type !== "success" || !res.url) return;

			await applySessionFromOAuthCallback(res.url, supabase);
			router.replace("/tabs/home");
		} catch (error) {
			const friendly = getFriendlyAuthError(error, "google_login");
			console.error(
				`[auth] google login failed (${friendly.reason})`,
				friendly.rawMessage,
			);
			setErrorModal({
				isOpen: true,
				title: friendly.title,
				message: friendly.message,
			});
		} finally {
			setGoogleLoading(false);
		}
	};

	const handleEmailContinue = () => {
		router.push("/(auth)/email");
	};

	return (
		<Box className="flex-1 bg-background pt-safe px-6">
			<Box
				className="flex-1"
				style={{
					paddingTop: Math.max(insets.top, 10) + 24,
					paddingBottom: Math.max(insets.bottom, 24),
				}}
			>
				<Box className="items-center">
					<Box className="h-[84px] w-[84px] overflow-hidden rounded-[28px] bg-card shadow-hard-4 items-center justify-center">
						<Image
							className="object-cover w-full h-full"
							source={require("../../assets/images/splash-icon.png")}
						/>
					</Box>

					<Heading className="mt-10 text-center text-4xl font-semibold">
						Prava Go
					</Heading>
					<Text className="mt-3 text-center mx-auto max-w-[280px] text-lg text-foreground/70">
						Nazariy va amaliy testlarga bitta ilovada tayyorlaning.
					</Text>
				</Box>

				<Box className="mt-auto">
					<Pressable
						onPress={handleGoogleContinue}
						disabled={googleLoading}
						style={({ pressed }) => ({
							opacity: pressed || googleLoading ? 0.88 : 1,
							transform: [{ scale: pressed ? 0.992 : 1 }],
						})}
					>
						<Box className="h-[60px] rounded-full px-5 bg-card border border-border shadow-hard-4 flex-row items-center justify-center gap-3">
							<Image
								alt="Google icon"
								className="w-7 h-7"
								source={require("../../assets/images/google.png")}
							/>
							<Text className="text-lg font-semibold text-foreground">
								{googleLoading ? "Yuklanmoqda..." : "Continue with Google"}
							</Text>
						</Box>
					</Pressable>

					<Pressable
						className="mt-3"
						onPress={handleEmailContinue}
						style={({ pressed }) => ({
							opacity: pressed ? 0.92 : 1,
							transform: [{ scale: pressed ? 0.992 : 1 }],
						})}
					>
						<Box className="h-[60px] rounded-full px-5 bg-primary flex-row items-center justify-center gap-3">
							<Mail size={20} color={palette.background} />
							<Text className="text-lg font-semibold text-primary-foreground">
								Continue with E-mail
							</Text>
						</Box>
					</Pressable>

					<Text className="mt-6 text-center text-sm text-foreground/60 leading-6">
						Davom etish orqali siz Prava Go xizmat shartlari va maxfiylik
						siyosatiga rozilik bildirasiz.
					</Text>
				</Box>
			</Box>
			<AuthErrorModal
				isOpen={errorModal.isOpen}
				title={errorModal.title}
				message={errorModal.message}
				onClose={() =>
					setErrorModal((prev) => ({
						...prev,
						isOpen: false,
					}))
				}
			/>
		</Box>
	);
}
