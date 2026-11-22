export type I18nMissingKeyMode = 'return-key' | 'throw';

export interface I18nModuleOptions {
	/**
	 * Language that defines the canonical key set: it is the last-resort
	 * fallback for lookups and the reference for `strict` mode and type
	 * generation.
	 */
	fallbackLanguage: string;
	/**
	 * Directory containing one subdirectory per locale
	 * (e.g. `./i18n/en`, `./i18n/uk`). Each locale directory may contain
	 * `.json` files in nested subfolders.
	 */
	localesPath: string;
	/**
	 * Reload translations when JSON files change.
	 * Defaults to `true` outside production (`NODE_ENV !== 'production'`).
	 */
	watch?: boolean;
	/**
	 * When `true`, every locale must contain all keys of `fallbackLanguage`.
	 * Module initialization fails with a detailed error otherwise.
	 */
	strict?: boolean;
	/**
	 * Prefix every key with its JSON file namespace
	 * (`user.json` → `user.profile.name`). When `false` (default), keys are
	 * global dot-paths merged across all files of a locale.
	 */
	namespaceByFile?: boolean;
	/**
	 * Per-locale fallback chains, e.g. `{ 'de-AT': 'de', 'zh-CN': 'zh' }`.
	 * Lookup order for `de-AT`: `de-AT` → `de` → `fallbackLanguage`.
	 * Locale tags are canonicalized (`de-at`, `de_AT` match `de-AT`).
	 */
	fallbacks?: Record<string, string>;
	/**
	 * Locale used when a `t()` call does not specify `locale`.
	 * Defaults to `fallbackLanguage`.
	 */
	defaultLocale?: string;
	/**
	 * Behavior for missing keys: `'return-key'` (default) returns the key
	 * itself, `'throw'` raises an error.
	 */
	missingKey?: I18nMissingKeyMode;
	/** Enable informational logging. */
	logging?: boolean;
}
