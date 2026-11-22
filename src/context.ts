import { AsyncLocalStorage } from 'node:async_hooks';

interface I18nContextStore {
	locale?: string;
}

const storage = new AsyncLocalStorage<I18nContextStore>();

/**
 * Request/interaction-scoped locale context backed by
 * `AsyncLocalStorage`. Set the locale once per execution context
 * (HTTP request via resolvers, bot interaction, job, ...) and every
 * `I18nService.t()` call inside automatically uses it — no need to
 * pass `locale` through the call chain.
 *
 * Locale precedence in `t()`:
 * `options.locale` → `I18nContext.locale()` → `defaultLocale` →
 * `fallbackLanguage`.
 *
 * @example
 * ```ts
 * // Scoped to a synchronous/asynchronous callback
 * I18nContext.run('ru', () => i18n.t('hello'));
 *
 * // For the rest of the current async execution (e.g. middleware)
 * I18nContext.enterWith('ru');
 * ```
 */
export class I18nContext {
	/**
	 * Run `fn` with `locale` bound to the async context. The locale is
	 * automatically restored when `fn` returns.
	 */
	static run<T>(locale: string, fn: () => T): T {
		return storage.run({ locale }, fn);
	}

	/**
	 * Bind `locale` to the current async execution for the remainder of
	 * its lifetime — useful in middleware/interceptors where wrapping a
	 * callback is not possible. Prefer {@link run} when you can.
	 */
	static enterWith(locale: string): void {
		storage.enterWith({ locale });
	}

	/** Locale bound to the current async context, if any. */
	static locale(): string | undefined {
		return storage.getStore()?.locale;
	}

	/** Whether a locale is bound to the current async context. */
	static has(): boolean {
		return storage.getStore()?.locale !== undefined;
	}
}
