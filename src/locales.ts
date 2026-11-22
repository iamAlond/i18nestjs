import { LocaleMessages } from './scan';

/**
 * Canonicalize a locale tag: `de-at`/`de_AT`/`DE-at` → `de-AT`,
 * legacy aliases like `iw` → `he`. Returns the input on invalid tags.
 */
export function normalizeLocale(locale: string): string {
	const candidate = locale.trim().replace(/_/g, '-');
	try {
		return Intl.getCanonicalLocales(candidate)[0] ?? candidate;
	} catch {
		return candidate;
	}
}

/** Canonicalize user-provided `fallbacks` option keys and values. */
export function normalizeFallbacks(fallbacks?: Record<string, string>): Map<string, string> {
	const map = new Map<string, string>();
	for (const [from, to] of Object.entries(fallbacks ?? {})) {
		map.set(normalizeLocale(from), normalizeLocale(to));
	}
	return map;
}

/**
 * Re-key a loaded locale map by canonical locale tags. Locales that
 * canonicalize to the same tag are merged (later entries win per key).
 */
export function normalizeLocaleMessages(
	locales: LocaleMessages,
	onWarn?: (message: string) => void
): LocaleMessages {
	const result: LocaleMessages = new Map();

	for (const [locale, messages] of locales) {
		const canonical = normalizeLocale(locale);
		const existing = result.get(canonical);

		if (existing) {
			onWarn?.(
				`Locales "${locale}" and an earlier entry both canonicalize to "${canonical}" — merging`
			);
			for (const [key, message] of messages) existing.set(key, message);
		} else {
			result.set(canonical, new Map(messages));
		}
	}

	return result;
}

/** Primary language subtag: `pt-BR` → `pt`, `zh-Hant-TW` → `zh`. */
function baseLanguage(locale: string): string | undefined {
	const base = locale.split('-')[0];
	return base === locale ? undefined : base;
}

/**
 * Ordered fallback chain for a locale:
 * requested → explicit fallbacks → base language (optional) → terminal
 * (`fallbackLanguage`). Cycle-safe; the terminal is always last.
 *
 * With `useBaseFallback`, every hop without an explicit fallback entry
 * falls back to its primary language subtag (`pt-BR` → `pt`), so a
 * `pt/` directory serves all Portuguese variants automatically.
 */
export function localeChain(
	locale: string,
	fallbacks: Map<string, string>,
	terminal: string,
	useBaseFallback = true
): string[] {
	const term = normalizeLocale(terminal);
	const chain: string[] = [];
	const seen = new Set<string>();

	let current: string | undefined = normalizeLocale(locale);
	while (current && !seen.has(current)) {
		seen.add(current);
		chain.push(current);
		if (current === term) break;
		current = fallbacks.get(current) ?? (useBaseFallback ? baseLanguage(current) : undefined);
	}

	if (!chain.includes(term)) chain.push(term);
	return chain;
}

/**
 * The chain without the terminal fallback language — used by strict mode
 * and `validate` to tell "covered by an intermediate locale" apart from
 * "effectively untranslated, served by the global fallback".
 */
export function explicitChain(
	locale: string,
	fallbacks: Map<string, string>,
	terminal: string,
	useBaseFallback = true
): string[] {
	const term = normalizeLocale(terminal);
	return localeChain(locale, fallbacks, term, useBaseFallback).filter(l => l !== term);
}
