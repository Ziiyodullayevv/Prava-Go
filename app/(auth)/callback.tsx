import React from "react";
import { Platform, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { getFriendlyAuthError } from "@/lib/auth-error";
import { applySessionFromOAuthCallback } from "@/lib/oauth-callback";

export default function OAuthCallbackScreen() {
	const router = useRouter();
	const [isLoading, setIsLoading] = React.useState(true);
	const [errorText, setErrorText] = React.useState("");

	React.useEffect(() => {
		let active = true;

		const completeAuth = async () => {
			try {
				const callbackUrl =
					Platform.OS === "web" && typeof window !== "undefined"
						? window.location.href
						: ((await Linking.getInitialURL()) ?? "");
				if (!callbackUrl) throw new Error("Google callback URL topilmadi.");

				await applySessionFromOAuthCallback(callbackUrl);
				if (!active) return;
				router.replace("/tabs/home");
			} catch (error) {
				if (!active) return;
				const friendly = getFriendlyAuthError(error, "google_login");
				console.error(
					`[auth] google callback failed (${friendly.reason})`,
					friendly.rawMessage,
				);
				setErrorText(friendly.message);
			} finally {
				if (active) setIsLoading(false);
			}
		};

		void completeAuth();
		return () => {
			active = false;
		};
	}, [router]);

	return (
		<Box className="flex-1 bg-background px-6 justify-center items-center">
			{isLoading ? (
				<>
					<Heading className="text-2xl text-center font-semibold">
						Kirish tasdiqlanmoqda...
					</Heading>
					<Text className="mt-3 text-base text-center text-foreground/70">
						Iltimos, kuting.
					</Text>
				</>
			) : (
				<>
					<Heading className="text-2xl text-center font-semibold">
						Kirishda xatolik
					</Heading>
					<Text className="mt-3 text-base text-center text-foreground/70">
						{errorText || "Google orqali kirish yakunlanmadi."}
					</Text>
					<Pressable
						className="mt-8"
						onPress={() => router.replace("/(auth)/login")}
					>
						<Box className="h-[52px] rounded-full bg-primary px-6 items-center justify-center">
							<Text className="text-base font-semibold text-primary-foreground">
								Qayta urinish
							</Text>
						</Box>
					</Pressable>
				</>
			)}
		</Box>
	);
}
