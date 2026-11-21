import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageCompiler } from './compiler';
import { JsonLoader } from './loader';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import { I18nModuleOptions } from './options';
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

	constructor(
		@Inject(MODULE_OPTIONS_TOKEN) private readonly options: I18nModuleOptions,
		private readonly loader: JsonLoader
	) {}

	onModuleInit(): void {
		this.reload();
		this.loader.watch(() => this.reload());
	}

	/** Reload all translation files from disk. */
	reload(): void {
		const loaded = this.loader.load();

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
		const fallback = loaded.get(this.options.fallbackLanguage);
		if (!fallback) {
			throw new Error(
				`i18nestjs strict mode: fallback locale "${this.options.fallbackLanguage}" not found in ${this.options.localesPath}`
			);
		}

		const problems: string[] = [];
		for (const [locale, messages] of loaded) {
			if (locale === this.options.fallbackLanguage) continue;

			const missing = [...fallback.keys()].filter(key => !messages.has(key));
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
	 * i18n.t('items', { count: 3, locale: 'uk' })
	 */
	t<K extends I18nKey>(key: K, ...params: I18nCallParams<K>): string {
		const options = (params[0] ?? {}) as I18nCallOptions<K> & I18nReservedOptions;
		const { locale, defaultValue, debug, ...values } =
			options as unknown as I18nReservedOptions & Record<string, I18nValue>;

		const requested = locale ?? this.options.defaultLocale ?? this.options.fallbackLanguage;

		const direct = this.messages.get(requested)?.get(key);
		let message: string | undefined;
		let messageLocale = requested;

		if (direct !== undefined) {
			message = direct;
		} else {
			const fallback = this.messages.get(this.options.fallbackLanguage)?.get(key);
			if (fallback !== undefined) {
				message = fallback;
				messageLocale = this.options.fallbackLanguage;
			}
		}

		if (message === undefined) {
			if (defaultValue !== undefined) return defaultValue;
			return this.handleMissingKey(key, requested);
		}

		if (debug) return key;

		return this.compiler.format(message, messageLocale, values);
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
		return this.messages.get(locale)?.get(key);
	}

	/** Whether a key exists in the given locale (or the fallback locale). */
	has(key: string, locale?: string): boolean {
		const target = locale ?? this.options.fallbackLanguage;
		return (
			this.messages.get(target)?.has(key) === true ||
			this.messages.get(this.options.fallbackLanguage)?.has(key) === true
		);
	}

	/**
	 * Returns a scoped view of this service bound to a fixed locale.
	 *
	 * @example
	 * const uk = i18n.withLocale('uk');
	 * uk.t('hello', { name: 'Світ' });
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
