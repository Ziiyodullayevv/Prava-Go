export type AuthErrorContext =
	| "google_login"
	| "email_send_code"
	| "otp_verify"
	| "otp_resend";

export type FriendlyAuthError = {
	title: string;
	message: string;
	rawMessage: string;
	reason: string;
};

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string") return message;
	}
	return "";
}

function includesAny(haystack: string, needles: string[]) {
	return needles.some((needle) => haystack.includes(needle));
}

export function getFriendlyAuthError(
	error: unknown,
	context: AuthErrorContext,
): FriendlyAuthError {
	const rawMessage = extractErrorMessage(error);
	const normalized = rawMessage.toLowerCase();

	if (
		includesAny(normalized, [
			"out of space",
			"no space left",
			"insufficient storage",
			"database or disk is full",
			"nscocoaerrordomain code=640",
			"failed to write value",
			"quota exceeded",
		])
	) {
		return {
			title: "Xotira yetarli emas",
			message:
				"Qurilmada bo'sh joy yetarli emas. Joy bo'shatib qayta urinib ko'ring.",
			rawMessage,
			reason: "local_storage_full",
		};
	}

	if (
		includesAny(normalized, [
			"network request failed",
			"network error",
			"timeout",
			"timed out",
			"failed to fetch",
		])
	) {
		return {
			title: "Internet xatosi",
			message: "Internet ulanishini tekshirib, qayta urinib ko'ring.",
			rawMessage,
			reason: "network",
		};
	}

	if (
		includesAny(normalized, [
			"token has expired",
			"expired",
			"invalid token",
			"otp",
			"code is invalid",
		])
	) {
		return {
			title: "Kod xatosi",
			message:
				"Tasdiqlash kodi yaroqsiz yoki muddati tugagan. Qayta kod so'rang.",
			rawMessage,
			reason: "otp_invalid_or_expired",
		};
	}

	const fallbackByContext: Record<AuthErrorContext, { title: string; message: string }> = {
		google_login: {
			title: "Kirishda xatolik",
			message: "Google orqali kirib bo'lmadi. Qayta urinib ko'ring.",
		},
		email_send_code: {
			title: "Kod yuborilmadi",
			message: "E-mail manzilni tekshirib qayta urinib ko'ring.",
		},
		otp_verify: {
			title: "Kod tasdiqlanmadi",
			message: "Kodni tekshirib qayta kiriting.",
		},
		otp_resend: {
			title: "Qayta yuborilmadi",
			message: "Kod qayta yuborilmadi. Birozdan keyin urinib ko'ring.",
		},
	};

	const fallback = fallbackByContext[context];
	return {
		title: fallback.title,
		message: fallback.message,
		rawMessage,
		reason: "unknown",
	};
}
