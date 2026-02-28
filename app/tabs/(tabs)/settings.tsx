import React, { useMemo, useRef, useState } from "react";
import { Animated, Linking, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
	ChevronRight,
	CircleHelp,
	Instagram,
	Languages,
	LogOut,
	Send,
	Youtube,
} from "lucide-react-native";

import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { Box } from "@/components/ui/box";
import {
	BottomSheet,
	BottomSheetBackdrop,
	type BottomSheetController,
	BottomSheetContent,
	BottomSheetDragIndicator,
	BottomSheetPortal,
	BottomSheetScrollView,
} from "@/components/ui/bottomsheet";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Colors } from "@/constants/Colors";
import { useAppTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";

import { SettingsRowsCard } from "@/features/settings/components/SettingsRowsCard";
import type { RowItem, ThemeColors } from "@/features/settings/types";
import { SUPPORTED_LANGUAGES, useI18n } from "@/locales/i18n-provider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const languageSheetRef = useRef<BottomSheetController | null>(null);
	const scrollY = useRef(new Animated.Value(0)).current;
	const [pushEnabled, setPushEnabled] = useState(true);
	const [logoutLoading, setLogoutLoading] = useState(false);
	const [logoutError, setLogoutError] = useState("");

	const { colorMode, themePreference, setThemePreference } = useAppTheme();
	const { signOut, user } = useAuth();
	const { language, setLanguage, t } = useI18n();
	const isDarkMode = colorMode === "dark";
	const headerTitleOpacity = scrollY.interpolate({
		inputRange: [92, 120],
		outputRange: [0, 1],
		extrapolate: "clamp",
	});

	const rawNameFromMeta =
		typeof user?.user_metadata?.given_name === "string" &&
		user.user_metadata.given_name.trim().length > 0
			? user.user_metadata.given_name
			: typeof user?.user_metadata?.full_name === "string" &&
				  user.user_metadata.full_name.trim().length > 0
				? user.user_metadata.full_name
				: typeof user?.user_metadata?.name === "string" &&
					  user.user_metadata.name.trim().length > 0
					? user.user_metadata.name
					: "";

	const firstNameFromEmail = (user?.email?.split("@")[0] ?? "Foydalanuvchi")
		.split(/[._-]/)[0]
		.trim();
	const displayNameRaw =
		rawNameFromMeta.trim().length > 0 ? rawNameFromMeta : firstNameFromEmail;
	const displayName = displayNameRaw.split(/\s+/)[0] ?? displayNameRaw;
	const rawAvatar =
		user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
	const avatarUri =
		typeof rawAvatar === "string" && rawAvatar.trim().length > 0
			? rawAvatar
			: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80";

	const profileMeta = user?.email ?? "";
	const footerPlatformText = t(
		Platform.OS === "android"
			? "settings.footer.platform.android"
			: Platform.OS === "ios"
				? "settings.footer.platform.ios"
				: "settings.footer.platform",
		Platform.OS === "android"
			? "Prava Go v1.0.0 · Android uchun"
			: Platform.OS === "ios"
				? "Prava Go v1.0.0 · iOS uchun"
				: "Prava Go v1.0.0",
	);

	const openLanguageSheet = () => {
		languageSheetRef.current?.open();
	};

	const selectLanguage = (nextLanguage: (typeof SUPPORTED_LANGUAGES)[number]) => {
		setLanguage(nextLanguage);
		languageSheetRef.current?.close();
	};

	const handleOpenSocialLink = async (url: string) => {
		const canOpen = await Linking.canOpenURL(url);
		if (!canOpen) return;
		await Linking.openURL(url);
	};

	const currentLanguageLabel = t(
		`settings.language.${language}`,
		language,
	);

	const handleLogout = async () => {
		if (logoutLoading) return;

		setLogoutError("");
		setLogoutLoading(true);
		try {
			await signOut();
			router.replace("/(auth)/login");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: t(
							"settings.logoutError",
							"Something went wrong while signing out.",
						);
			setLogoutError(message);
		} finally {
			setLogoutLoading(false);
		}
	};

	const colors: ThemeColors = {
		iconColor: isDarkMode ? Colors.dark.text : Colors.light.text,
		activeColor: isDarkMode ? Colors.dark.tint : Colors.light.tint,
		inactiveColor: isDarkMode
			? Colors.dark.tabIconDefault
			: Colors.light.tabIconDefault,
		switchThumbColor: isDarkMode ? Colors.dark.text : Colors.light.background,
		pressedRowBg: isDarkMode
			? Colors.dark.tabsBackground
			: Colors.light.tabsBackground,
	};

	const rows = useMemo<RowItem[]>(
		() => [
			{
				id: "language",
				title: t("settings.language", "Language"),
				subtitle: currentLanguageLabel,
				icon: Languages,
				onPress: openLanguageSheet,
			},
			{
				id: "faq",
				title: t("settings.faq", "FAQs"),
				subtitle: t("settings.faqDescription", "Frequently asked questions"),
				icon: CircleHelp,
				onPress: () => {},
			},
		],
		[currentLanguageLabel, openLanguageSheet, t],
	);

	const themeOptions = useMemo<
		Array<{
			id: "system" | "dark" | "light";
			title: string;
			description: string;
		}>
	>(
		() => [
			{
				id: "system",
				title: t("settings.theme.system", "Automatic"),
				description: t(
					"settings.theme.systemDescription",
					"Follow your device theme",
				),
			},
			{
				id: "dark",
				title: t("settings.theme.dark", "Dark"),
				description: t("settings.theme.darkDescription", "Always use dark mode"),
			},
			{
				id: "light",
				title: t("settings.theme.light", "Light"),
				description: t("settings.theme.lightDescription", "Always use light mode"),
			},
		],
		[t],
	);

	const socialItems = useMemo<
		Array<{
			id: string;
			title: string;
			description: string;
			url: string;
			icon: React.ComponentType<{
				size?: number;
				color?: string;
				strokeWidth?: number;
			}>;
		}>
	>(
		() => [
			{
				id: "youtube",
				title: t("settings.social.youtube.title", "YouTube"),
				description: t(
					"settings.social.youtube.description",
					"Video guides and product updates",
				),
				url: "https://youtube.com/@akobirjsdev",
				icon: Youtube,
			},
			{
				id: "instagram",
				title: t("settings.social.instagram.title", "Instagram"),
				description: t(
					"settings.social.instagram.description",
					"Latest updates and short content",
				),
				url: "https://instagram.com/akobirjsdev",
				icon: Instagram,
			},
			{
				id: "telegram",
				title: t("settings.social.telegram.title", "Telegram"),
				description: t(
					"settings.social.telegram.description",
					"Announcements and direct communication",
				),
				url: "https://t.me/akobirjsdev",
				icon: Send,
			},
		],
		[t],
	);

	return (
		<BottomSheet ref={languageSheetRef} snapToIndex={0}>
			<Box className="flex-1 bg-background">
				<Animated.View
					pointerEvents="none"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						zIndex: 20,
						opacity: headerTitleOpacity,
					}}
				>
					<Box
						className="border-b border-border bg-background"
						style={{ paddingTop: insets.top }}
					>
						<Box className="h-12 items-center justify-center">
							<Heading className="text-lg font-semibold">
								{t("settings.title", "Settings")}
							</Heading>
						</Box>
					</Box>
				</Animated.View>

				<Animated.ScrollView
					showsVerticalScrollIndicator={false}
					scrollEventThrottle={16}
					onScroll={Animated.event(
						[{ nativeEvent: { contentOffset: { y: scrollY } } }],
						{ useNativeDriver: true },
					)}
					contentContainerStyle={{
						paddingTop: insets.top + 8,
						paddingHorizontal: 16,
						paddingBottom: Math.max(insets.bottom, 20) + 64,
					}}
				>
					<Box className="items-center pt-3">
						<Avatar className="h-[108px] w-[108px] border-[3px] border-background">
							<AvatarFallbackText>{displayName}</AvatarFallbackText>
							<AvatarImage source={{ uri: avatarUri }} />
						</Avatar>

						<Heading className="mt-3 text-[30px] leading-[34px] font-semibold">
							{displayName}
						</Heading>
						<Text
							className="mt-1 text-base text-muted-foreground text-center"
						>
							{profileMeta}
						</Text>
					</Box>

					{logoutError ? (
						<Heading className="mt-2 text-sm text-destructive font-normal">
							{logoutError}
						</Heading>
					) : null}

					<SettingsRowsCard
						rows={rows}
						colors={colors}
						pushEnabled={pushEnabled}
						onTogglePush={() => setPushEnabled((prev) => !prev)}
						onSetPushEnabled={setPushEnabled}
						pushTitle={t("settings.pushTitle", "Push Notifications")}
						pushSubtitle={t(
							"settings.pushSubtitle",
							"Receive important app alerts",
						)}
					/>

					<Heading className="text-base mt-4 font-semibold">
						{t("settings.theme.title", "Theme")}
					</Heading>

					<Box className="mt-3 rounded-3xl shadow-soft-5 bg-card overflow-hidden">
						{themeOptions.map((item, index) => {
							const isSelected = themePreference === item.id;
							const isLast = index === themeOptions.length - 1;

							return (
								<Pressable
									key={item.id}
									onPress={() => setThemePreference(item.id)}
									style={({ pressed }) => ({
										backgroundColor: pressed
											? colors.pressedRowBg
											: "transparent",
									})}
									android_ripple={{ color: colors.pressedRowBg }}
								>
									<Box className="px-4 py-4 flex-row items-center">
										<Box className="flex-1 pr-3" style={{ minWidth: 0 }}>
											<Heading
												className="text-sm font-semibold"
												style={{ flexShrink: 1 }}
											>
												{item.title}
											</Heading>
											<Text
												className="mt-1 text-[12px] leading-5 text-muted-foreground"
												style={{ flexShrink: 1 }}
											>
												{item.description}
											</Text>
										</Box>

										<Box
											className="h-5 w-5 rounded-full border items-center justify-center"
											style={{
												borderColor: isSelected
													? colors.activeColor
													: colors.inactiveColor,
											}}
										>
											{isSelected ? (
												<Box
													className="h-2.5 w-2.5 rounded-full"
													style={{ backgroundColor: colors.activeColor }}
												/>
											) : null}
										</Box>
									</Box>
									{!isLast ? <Divider className="mx-4" /> : null}
								</Pressable>
							);
						})}
					</Box>

					<Heading className="text-base mt-4 font-semibold">
						{t("settings.social.title", "Social Media")}
					</Heading>

					<Box className="mt-3 rounded-3xl shadow-soft-5 bg-card overflow-hidden">
						{socialItems.map((item, index) => {
							const Icon = item.icon;
							const isLast = index === socialItems.length - 1;

							return (
								<Pressable
									key={item.id}
									onPress={() => {
										handleOpenSocialLink(item.url).catch(() => {});
									}}
									style={({ pressed }) => ({
										backgroundColor: pressed
											? colors.pressedRowBg
											: "transparent",
									})}
									android_ripple={{ color: colors.pressedRowBg }}
								>
									<Box className="px-4 py-4 flex-row items-center">
										<Box className="h-10 w-10 rounded-xl bg-card-custom shadow-soft-5 items-center justify-center">
											<Icon size={22} color={colors.iconColor} strokeWidth={1.9} />
										</Box>

										<Box className="ml-4 flex-1 pr-2" style={{ minWidth: 0 }}>
											<Heading
												className="text-sm font-semibold"
												style={{ flexShrink: 1 }}
											>
												{item.title}
											</Heading>
											<Text
												className="mt-1 text-[12px] leading-5 text-muted-foreground"
												style={{ flexShrink: 1 }}
											>
												{item.description}
											</Text>
										</Box>

										<ChevronRight size={22} color={colors.iconColor} />
									</Box>
									{!isLast ? <Divider className="mx-4" /> : null}
								</Pressable>
							);
						})}
					</Box>

					<Box className="mt-4 rounded-3xl shadow-soft-5 bg-card overflow-hidden">
						<Pressable
							onPress={handleLogout}
							disabled={logoutLoading}
							style={({ pressed }) => ({
								backgroundColor: pressed ? colors.pressedRowBg : "transparent",
								opacity: logoutLoading ? 0.7 : 1,
							})}
							android_ripple={{ color: colors.pressedRowBg }}
						>
							<Box className="px-4 py-4 flex-row items-center">
								<Box className="h-10 w-10 rounded-xl bg-card-custom shadow-soft-5 items-center justify-center">
									<LogOut size={22} color={colors.iconColor} strokeWidth={1.9} />
								</Box>

								<Box className="ml-4 flex-1 pr-2" style={{ minWidth: 0 }}>
									<Heading
										className="text-sm font-semibold"
										style={{ flexShrink: 1 }}
									>
										{logoutLoading
											? t("settings.loggingOut", "Logging out...")
											: t("settings.logout", "Log out")}
									</Heading>
									<Text
										className="mt-1 text-[12px] leading-5 text-muted-foreground"
										style={{ flexShrink: 1 }}
									>
										{t("settings.logoutSubtitle", "Sign out from your account")}
									</Text>
								</Box>

								<ChevronRight size={22} color={colors.iconColor} />
							</Box>
						</Pressable>
					</Box>

					<Box className="mt-10 mb-3 items-center">
						<Text className="text-sm text-muted-foreground text-center">
							{footerPlatformText}
						</Text>
						<Text className="mt-1 text-sm text-muted-foreground text-center">
							{t("settings.footer.author", "Developed by akobirjsdev")}
						</Text>
					</Box>
				</Animated.ScrollView>
			</Box>

			<BottomSheetPortal
				backgroundStyle={{
					borderTopLeftRadius: 30,
					borderTopRightRadius: 30,
					opacity: 0,
				}}
				snapPoints={["60%", "100%"]}
				enableDynamicSizing={false}
				enableHandlePanningGesture
				enableContentPanningGesture
				enableOverDrag={false}
				topInset={insets.top}
				backdropComponent={(props) => (
					<BottomSheetBackdrop
						{...props}
						appearsOnIndex={0}
						disappearsOnIndex={-1}
					/>
				)}
				handleComponent={(props) => (
					<BottomSheetDragIndicator
						{...props}
						className="rounded-t-[30px] bg-card border-b border-border"
					>
						<Text className="text-lg mt-4 font-medium">
							{t("settings.languageSheetTitle", "Select language")}
						</Text>
					</BottomSheetDragIndicator>
				)}
			>
				<BottomSheetContent className="px-5 pb-0 bg-card h-full">
					<BottomSheetScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							paddingTop: 12,
							paddingBottom: Math.max(insets.bottom, 20),
						}}
					>
						<Text className="text-sm text-muted-foreground">
							{t("settings.languageSheetSubtitle", "Choose app language")}
						</Text>

						<Box className="mt-4 rounded-2xl bg-background overflow-hidden">
							{SUPPORTED_LANGUAGES.map((code, index) => {
								const isSelected = language === code;
								const isLast = index === SUPPORTED_LANGUAGES.length - 1;

								return (
									<Pressable
										key={code}
										onPress={() => selectLanguage(code)}
										className="px-4 py-4"
										style={({ pressed }) => ({
											backgroundColor: pressed
												? colors.pressedRowBg
												: "transparent",
										})}
										android_ripple={{ color: colors.pressedRowBg }}
									>
										<Box className="flex-row items-center">
											<Text className="flex-1 text-sm font-semibold">
												{t(`settings.language.${code}`, code)}
											</Text>
											<Box
												className="h-5 w-5 rounded-full border items-center justify-center"
												style={{
													borderColor: isSelected
														? colors.activeColor
														: colors.inactiveColor,
												}}
											>
												{isSelected ? (
													<Box
														className="h-2.5 w-2.5 rounded-full"
														style={{ backgroundColor: colors.activeColor }}
													/>
												) : null}
											</Box>
										</Box>
										{!isLast ? <Divider className="mt-4" /> : null}
									</Pressable>
								);
							})}
						</Box>
					</BottomSheetScrollView>
				</BottomSheetContent>
			</BottomSheetPortal>
		</BottomSheet>
	);
}
