/**
 * Augment this interface via TypeScript module augmentation to enable
 * type-safe translation keys and per-key argument types.
 *
 * The recommended way is the `i18nestjs types` CLI, which generates a
 * declaration file from your fallback-language JSON files. You can also
 * write the augmentation by hand.
 *
 * @example
 * ```ts
 * declare module 'i18nestjs' {
 * 	interface I18nTypes {
 * 		keys: 'hello' | 'items';
 * 		args: {
 * 			hello: { name: string | number };
 * 			items: { count: number };
 * 		};
 * 	}
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentionally empty: users augment it via `declare module 'i18nestjs'`
export interface I18nTypes {}

/** All known translation keys. `string` when types are not generated. */
export type I18nKey = I18nTypes extends { keys: infer K } ? Extract<K, string> : string;

type I18nArgsMap = I18nTypes extends { args: infer A } ? A : Record<string, any>;

type ArgsFor<K extends string> = K extends keyof I18nArgsMap
	? I18nArgsMap[K]
	: Record<never, never>;

type IsAny<T> = 0 extends 1 & T ? true : false;

/** ICU argument values accepted at runtime. */
export type I18nValue = string | number | boolean | Date | null | undefined;

/**
 * Reserved option keys. They are stripped before values are passed to the
 * ICU formatter, so translation arguments must not use these names.
 */
export interface I18nReservedOptions {
	/** BCP 47 locale for this call. Defaults to `defaultLocale`/`fallbackLanguage`. */
	locale?: string;
	/** Returned when the key is missing (and `missingKey` is not `'throw'`). */
	defaultValue?: string;
	/** Return the key itself instead of translating. */
	debug?: boolean;
}

/** Full options object for `t(key, options)`: reserved options + ICU arguments. */
export type I18nCallOptions<K extends string> =
	IsAny<ArgsFor<K>> extends true
		? I18nReservedOptions & Record<string, I18nValue>
		: I18nReservedOptions & ArgsFor<K>;

/**
 * Tuple type for the rest parameters of `t()`.
 * The options argument is required when the key declares ICU arguments.
 */
export type I18nCallParams<K extends string> =
	IsAny<ArgsFor<K>> extends true
		? [options?: I18nCallOptions<K>]
		: keyof ArgsFor<K> extends never
			? [options?: I18nCallOptions<K>]
			: [options: I18nCallOptions<K>];
