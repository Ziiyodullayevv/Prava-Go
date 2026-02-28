import React from "react";
import {
	Pressable,
	TextInput,
	type NativeSyntheticEvent,
	type TextInputKeyPressEventData,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { getSupabaseClient } from "@/lib/supabase";

const OTP_LENGTH = 6;

function maskEmail(email: string) {
	const trimmed = email.trim().toLowerCase();
	if (!trimmed.includes("@")) return trimmed;

	const [name, domain] = trimmed.split("@");
	if (!domain) return trimmed;

	if (name.length <= 2) {
		return `${name[0] ?? ""}***@${domain}`;
	}

	return `${name.slice(0, 2)}***@${domain}`;
}

export default function OtpScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const params = useLocalSearchParams<{ email?: string }>();
	const { colorMode } = useAppTheme();
	const isDark = colorMode === "dark";
	const palette = isDark ? Colors.dark : Colors.light;

	const email = typeof params.email === "string" ? params.email : "";
	const [otp, setOtp] = React.useState<string[]>(
		Array.from({ length: OTP_LENGTH }, () => ""),
	);
	const [verifyLoading, setVerifyLoading] = React.useState(false);
	const [resendLoading, setResendLoading] = React.useState(false);
	const [submitError, setSubmitError] = React.useState("");
	const [resendStatus, setResendStatus] = React.useState("");
	const inputRefs = React.useRef<Array<TextInput | null>>([]);

	const isComplete = otp.every((digit) => digit.length === 1);

	const setDigit = (index: number, value: string) => {
		setOtp((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const handleOtpChange = (index: number, text: string) => {
		const digits = text.replace(/\D/g, "");
		if (!digits) {
			setDigit(index, "");
			return;
		}

		if (digits.length === 1) {
			setDigit(index, digits);
			if (index < OTP_LENGTH - 1) {
				inputRefs.current[index + 1]?.focus();
			}
			return;
		}

		setOtp((prev) => {
			const next = [...prev];
			for (let cursor = index; cursor < OTP_LENGTH; cursor += 1) {
				const digit = digits[cursor - index];
				next[cursor] = digit ?? next[cursor];
			}
			return next;
		});

		const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
		inputRefs.current[nextIndex]?.focus();
	};

	const handleOtpBackspace = (
		index: number,
		event: NativeSyntheticEvent<TextInputKeyPressEventData>,
	) => {
		if (event.nativeEvent.key !== "Backspace") return;

		if (otp[index]) {
			setDigit(index, "");
			return;
		}

		if (index > 0) {
			setDigit(index - 1, "");
			inputRefs.current[index - 1]?.focus();
		}
	};

	const normalizedEmail = email.trim().toLowerCase();

	const handleVerify = async () => {
		if (!isComplete || verifyLoading) return;
		if (!normalizedEmail) return;

		setSubmitError("");
		setResendStatus("");
		setVerifyLoading(true);
		try {
			const token = otp.join("");
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.verifyOtp({
				email: normalizedEmail,
				token,
				type: "email",
			});
			if (error) throw error;

			router.replace("/tabs/home");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Kodni tasdiqlashda xatolik yuz berdi.";
			setSubmitError(message);
		} finally {
			setVerifyLoading(false);
		}
	};

	const handleResend = async () => {
		if (resendLoading) return;
		if (!normalizedEmail) return;

		setResendLoading(true);
		setSubmitError("");
		setResendStatus("");
		setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
		try {
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.signInWithOtp({
				email: normalizedEmail,
				options: { shouldCreateUser: true },
			});
			if (error) throw error;

			setResendStatus("Kod qayta yuborildi.");
			inputRefs.current[0]?.focus();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Kodni qayta yuborishda xatolik yuz berdi.";
			setSubmitError(message);
		} finally {
			setResendLoading(false);
		}
	};

	React.useEffect(() => {
		if (!normalizedEmail) {
			router.replace("/(auth)/email");
			return;
		}

		const timer = setTimeout(() => {
			inputRefs.current[0]?.focus();
		}, 260);

		return () => clearTimeout(timer);
	}, [normalizedEmail, router]);

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

				<Heading className="mt-8 text-4xl font-semibold">
					Tasdiqlash kodi
				</Heading>
				<Text className="mt-2 text-base text-foreground/70 leading-6">
					6 xonali kod yuborildi: {maskEmail(email || "example@mail.com")}
				</Text>

				<Box className="mt-8 flex-row gap-2">
					{otp.map((value, index) => (
						<Box
							key={`otp-cell-${index}`}
							className={[
								"h-[56px] flex-1 rounded-2xl bg-card border items-center justify-center",
								value ? "border-brand" : "border-border",
							].join(" ")}
						>
							<TextInput
								ref={(ref) => {
									inputRefs.current[index] = ref;
								}}
								value={value}
								onChangeText={(text) => handleOtpChange(index, text)}
								onKeyPress={(event) => handleOtpBackspace(index, event)}
								maxLength={index === 0 ? OTP_LENGTH : 1}
								keyboardType="number-pad"
								returnKeyType="done"
								selectionColor={palette.text}
								placeholder="-"
								placeholderTextColor={
									isDark
										? "rgba(255,255,255,0.35)"
										: "rgba(0,0,0,0.35)"
								}
								style={{
									width: "100%",
									textAlign: "center",
									color: palette.text,
									fontSize: 22,
									fontWeight: "600",
									paddingVertical: 0,
								}}
							/>
						</Box>
					))}
				</Box>

				<Pressable
					className="mt-8"
					onPress={handleVerify}
					style={({ pressed }) => ({
						opacity: pressed || !isComplete || verifyLoading ? 0.72 : 1,
						transform: [{ scale: pressed ? 0.992 : 1 }],
					})}
					disabled={!isComplete || verifyLoading}
				>
					<Box className="h-[56px] rounded-full bg-primary items-center justify-center">
						<Text className="text-base font-semibold text-primary-foreground">
							{verifyLoading ? "Tekshirilmoqda..." : "Tasdiqlash"}
						</Text>
					</Box>
				</Pressable>

				{submitError ? (
					<Text className="mt-3 text-sm text-destructive">{submitError}</Text>
				) : null}
				{resendStatus ? (
					<Text className="mt-3 text-sm text-primary">{resendStatus}</Text>
				) : null}

				<Box className="mt-auto flex-row items-center justify-between">
					<Pressable onPress={handleResend} disabled={resendLoading}>
						<Text className="text-base text-foreground/80">
							{resendLoading ? "Yuborilmoqda..." : "Kodni qayta yuborish"}
						</Text>
					</Pressable>

					<Pressable
						onPress={() =>
							router.replace({
								pathname: "/(auth)/email",
								params: { email },
							})
						}
					>
						<Text className="text-base text-foreground/80">E-mailni o'zgartirish</Text>
					</Pressable>
				</Box>
			</Box>
		</Box>
	);
}
