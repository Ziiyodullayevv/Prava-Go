import React from "react";
import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Mail } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { AuthErrorModal } from "@/components/auth/AuthErrorModal";
import { getFriendlyAuthError } from "@/lib/auth-error";
import { getSupabaseClient } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ email?: string }>();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;

	const [email, setEmail] = React.useState(
		typeof params.email === "string" ? params.email : "",
	);
	const [triedContinue, setTriedContinue] = React.useState(false);
	const [isSending, setIsSending] = React.useState(false);
	const [errorModal, setErrorModal] = React.useState<{
		isOpen: boolean;
		title: string;
		message: string;
	}>({
		isOpen: false,
		title: "",
		message: "",
	});

	const normalizedEmail = email.trim().toLowerCase();
	const canContinue = EMAIL_REGEX.test(normalizedEmail);

	const handleContinue = async () => {
		if (isSending) return;

		setTriedContinue(true);
		if (!canContinue) return;

		setIsSending(true);
		try {
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.signInWithOtp({
				email: normalizedEmail,
				options: { shouldCreateUser: true },
			});
			if (error) throw error;

			router.push({
				pathname: "/(auth)/otp",
				params: {
					email: normalizedEmail,
				},
			});
		} catch (error) {
			const friendly = getFriendlyAuthError(error, "email_send_code");
			console.error(
				`[auth] email sign-in failed (${friendly.reason})`,
				friendly.rawMessage,
			);
			setErrorModal({
				isOpen: true,
				title: friendly.title,
				message: friendly.message,
			});
		} finally {
			setIsSending(false);
		}
	};

	return (
		<Box className="flex-1 bg-background pt-safe px-6">
			<Box
				className="flex-1"
				style={{
					paddingTop: Math.max(insets.top, 10) + 14,
					paddingBottom: Math.max(insets.bottom, 24),
				}}
			>
				<Pressable onPress={() => router.back()}>
					<Box className="h-12 w-12 rounded-full bg-card border border-border shadow-hard-3 items-center justify-center">
						<ChevronLeft size={24} color={palette.text} />
					</Box>
				</Pressable>

				<Heading className="mt-8 text-4xl font-semibold">Continue with E-mail</Heading>
				<Text className="mt-2 text-base text-foreground/70 leading-6">
					Tasdiqlash kodi yuborilishi uchun e-mail manzilingizni kiriting.
				</Text>

				<Box className="mt-8 rounded-3xl bg-card border border-border px-4 py-4">
					<Box className="flex-row items-center gap-3">
						<Mail size={20} color={palette.text} />
						<Input className="h-auto flex-1 border-0 !bg-transparent px-0">
							<InputField
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								textContentType="emailAddress"
								autoComplete="email"
								placeholder="example@mail.com"
								placeholderTextColor={
									isDark
										? "rgba(255,255,255,0.35)"
										: "rgba(0,0,0,0.35)"
								}
								className="text-base text-foreground"
							/>
						</Input>
					</Box>
				</Box>

				{triedContinue && !canContinue ? (
					<Text className="mt-3 text-sm text-destructive">
						To'g'ri e-mail manzil kiriting.
					</Text>
				) : null}

				<Box className="mt-auto">
					<Pressable
						onPress={handleContinue}
						disabled={isSending}
						style={({ pressed }) => ({
							opacity: pressed || isSending ? 0.92 : 1,
							transform: [{ scale: pressed ? 0.992 : 1 }],
						})}
					>
						<Box className="h-[56px] rounded-full bg-primary items-center justify-center">
							<Text className="text-base font-semibold text-primary-foreground">
								{isSending ? "Yuborilmoqda..." : "Davom etish"}
							</Text>
						</Box>
					</Pressable>

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
