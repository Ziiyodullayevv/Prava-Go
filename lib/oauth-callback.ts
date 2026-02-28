import { makeRedirectUri } from "expo-auth-session";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase";

function decodeUrlValue(value: string) {
	return decodeURIComponent(value.replace(/\+/g, "%20"));
}

function getUrlParam(url: string, key: string) {
	const sections: string[] = [];
	const queryStart = url.indexOf("?");
	if (queryStart >= 0) {
		sections.push(url.slice(queryStart + 1));
	}

	const hashStart = url.indexOf("#");
	if (hashStart >= 0) {
		sections.push(url.slice(hashStart + 1));
	}

	for (const section of sections) {
		const params = section.split("&");
		for (const pair of params) {
			const [rawKey, rawValue = ""] = pair.split("=");
			if (!rawKey) continue;

			const decodedKey = decodeUrlValue(rawKey);
			if (decodedKey !== key) continue;
			return decodeUrlValue(rawValue);
		}
	}

	return "";
}

export function getOAuthRedirectTo() {
	return makeRedirectUri({
		scheme: "prava",
		path: "auth/callback",
		preferLocalhost: true,
	});
}

export async function applySessionFromOAuthCallback(
	url: string,
	client: SupabaseClient = getSupabaseClient(),
) {
	const errorCode = getUrlParam(url, "error_code") || getUrlParam(url, "error");
	if (errorCode) {
		const errorDescription = getUrlParam(url, "error_description");
		throw new Error(errorDescription || errorCode);
	}

	const code = getUrlParam(url, "code");
	if (code) {
		const { error } = await client.auth.exchangeCodeForSession(code);
		if (error) throw error;
		return;
	}

	const accessToken = getUrlParam(url, "access_token");
	const refreshToken = getUrlParam(url, "refresh_token");
	if (!accessToken || !refreshToken) {
		throw new Error("Google callback token topilmadi.");
	}

	const { error } = await client.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});
	if (error) throw error;
}
