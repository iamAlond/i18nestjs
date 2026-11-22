import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageCompiler } from './compiler';
import { I18nContext } from './context';
import { JsonLoader } from './loader';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import { I18nModuleOptions } from './options';
import {
	explicitChain,
	localeChain,
	normalizeFallbacks,
	normalizeLocale,
	normalizeLocaleMessages
} from './locales';
import { LocaleMessages } from './scan';
import { I18nCallOptions, I18nCallParams, I18nKey, I18nReservedOptions, I18nValue } from './types';

@Injectable()
export class I18nService implements OnModuleInit {
	private readonly logger = new Logger(I18nService.name);
	private readonly compiler = new MessageCompiler((error, message, locale) => {
		if (this.options.logging) {
			this.logger.warn(
				`Failed to format message for locale "${locale}": ${(error as Error).message}`
			);
		}
	});

	private messages: LocaleMessages = new Map();
	private fallbacks = new Map<string, string>();
	private readonly fallbackLocale: string;
	private readonly useBaseFallback: boolean;

	constructor(
		@Inject(MODULE_OPTIONS_TOKEN) private readonly options: I18nModuleOptions,
		private readonly loader: JsonLoader
	) {
		this.fallbackLocale = normalizeLocale(options.fallbackLanguage);
		this.useBaseFallback = options.fallbackToBaseLanguage !== false;
	}

	onModuleInit(): void {
		this.reload();
		this.loader.watch(() => this.reload());
	}

	/** Reload all translation files from disk. */
	reload(): void {
		const loaded = normalizeLocaleMessages(this.loader.load(), message =>
			this.logger.warn(message)
		);
		this.fallbacks = normalizeFallbacks(this.options.fallbacks);

		if (this.options.strict) {
			this.assertStrict(loaded);
		}

		this.messages = loaded;
		this.compiler.clear();

		if (this.options.logging) {
			this.logger.log(
				`Translations loaded. Locales: ${this.getLocales().join(', ') || '(none)'}`
			);
		}
	}

	private assertStrict(loaded: LocaleMessages): void {
		const fallback = loaded.get(this.fallbackLocale);
		if (!fallback) {
			throw new Error(
				`i18nestjs strict mode: fallback locale "${this.options.fallbackLanguage}" not found in ${this.options.localesPath}`
			);
		}

		const problems: string[] = [];
		for (const [locale, messages] of loaded) {
			if (locale === this.fallbackLocale) continue;

			// Keys covered by an intermediate locale in the fallback chain
			// (e.g. de-AT → de) count as translated. Only the terminal
			// fallbackLanguage does not count — that would make strict
			// mode meaningless.
			const covered = new Set<string>();
			for (const chainLocale of explicitChain(
				locale,
				this.fallbacks,
				this.fallbackLocale,
				this.useBaseFallback
			)) {
				for (const key of loaded.get(chainLocale)?.keys() ?? []) {
					covered.add(key);
				}
			}

			const missing = [...fallback.keys()].filter(
				key => !messages.has(key) && !covered.has(key)
			);
			if (missing.length > 0) {
				problems.push(
					`locale "${locale}" is missing ${missing.length} key(s): ${missing
						.slice(0, 10)
						.map(key => `"${key}"`)
						.join(', ')}${missing.length > 10 ? ', ...' : ''}`
				);
			}
		}

		if (problems.length > 0) {
			throw new Error(`i18nestjs strict mode violations:\n- ${problems.join('\n- ')}`);
		}
	}

	/**
	 * Translate a key. When the key declares ICU arguments in the generated
	 * types, the options argument is required.
	 *
	 * @example
	 * i18n.t('hello', { name: 'World' })
	 * i18n.t('items', { count: 3, locale: 'ru' })
	 */
	t<K extends I18nKey>(key: K, ...params: I18nCallParams<K>): string {
		const options = (params[0] ?? {}) as I18nCallOptions<K> & I18nReservedOptions;
		const { locale, defaultValue, debug, ...values } =
			options as unknown as I18nReservedOptions & Record<string, I18nValue>;

		const requested = this.resolveLocale(locale);

		let message: string | undefined;
		let messageLocale = requested;

		for (const chainLocale of localeChain(
			requested,
			this.fallbacks,
			this.fallbackLocale,
			this.useBaseFallback
		)) {
			const candidate = this.messages.get(chainLocale)?.get(key);
			if (candidate !== undefined) {
				message = candidate;
				messageLocale = chainLocale;
				break;
			}
		}

		if (message === undefined) {
			if (defaultValue !== undefined) return defaultValue;
			return this.handleMissingKey(key, requested);
		}

		if (debug) return key;

		return this.compiler.format(message, messageLocale, values);
	}

	/** Effective locale for the current execution context. */
	locale(): string {
		return this.resolveLocale(undefined);
	}

	/**
	 * Locale precedence: explicit `locale` argument → `I18nContext`
	 * (request/bot-scoped) → `defaultLocale` → `fallbackLanguage`.
	 */
	private resolveLocale(locale?: string): string {
		return normalizeLocale(
			locale ??
				I18nContext.locale() ??
				this.options.defaultLocale ??
				this.options.fallbackLanguage
		);
	}

	private handleMissingKey(key: string, locale: string): string {
		if (this.options.missingKey === 'throw') {
			throw new Error(`Translation key "${key}" not found for locale "${locale}"`);
		}

		if (this.options.logging) {
			this.logger.warn(`Missing key: "${key}" in locale: "${locale}"`);
		}

		return key;
	}

	/** All loaded locale codes. */
	getLocales(): string[] {
		return [...this.messages.keys()];
	}

	/** Raw (uncompiled) message for a key, or `undefined`. */
	getMessage(locale: string, key: string): string | undefined {
		return this.messages.get(normalizeLocale(locale))?.get(key);
	}

	/** Whether a key exists in the given locale's fallback chain. */
	has(key: string, locale?: string): boolean {
		const requested = this.resolveLocale(locale);
		return localeChain(
			requested,
			this.fallbacks,
			this.fallbackLocale,
			this.useBaseFallback
		).some(chainLocale => this.messages.get(chainLocale)?.has(key));
	}

	/**
	 * Returns a scoped view of this service bound to a fixed locale.
	 *
	 * @example
	 * const ru = i18n.withLocale('ru');
	 * ru.t('hello', { name: 'Мир' });
	 */
	withLocale(locale: string): I18nScopedService {
		return new I18nScopedService(this, locale);
	}
}

/** Locale-bound view returned by {@link I18nService.withLocale}. */
export class I18nScopedService {
	constructor(
		private readonly service: I18nService,
		private readonly locale: string
	) {}

	t<K extends I18nKey>(key: K, ...params: I18nCallParams<K>): string {
		const options = (params[0] ?? {}) as Record<string, I18nValue>;
		return this.service.t(key, { ...options, locale: this.locale } as never);
	}
}
