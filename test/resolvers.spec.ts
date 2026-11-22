import { ExecutionContext } from '@nestjs/common';
import { I18nContext } from '../src/context';
import { I18nInterceptor } from '../src/interceptor';
import { I18nModuleOptions } from '../src/options';
import {
	CookieResolver,
	HeaderResolver,
	I18nResolver,
	ParamResolver,
	QueryResolver
} from '../src/resolvers';

function httpContext(request: Record<string, any>): ExecutionContext {
	return {
		getType: () => 'http',
		switchToHttp: () => ({ getRequest: () => request })
	} as unknown as ExecutionContext;
}

function rpcContext(): ExecutionContext {
	return {
		getType: () => 'rpc',
		switchToHttp: () => {
			throw new Error('No HTTP context');
		}
	} as unknown as ExecutionContext;
}

function interceptorWith(
	resolvers: I18nResolver[],
	context: ExecutionContext
): { locale: string | undefined; result: unknown } {
	const options: I18nModuleOptions = {
		fallbackLanguage: 'en',
		localesPath: '/unused',
		resolvers
	};
	const interceptor = new I18nInterceptor(options);

	let locale: string | undefined;
	const next = {
		handle: () => {
			locale = I18nContext.locale();
			return 'handled';
		}
	};

	// enterWith leaks into the surrounding async context — confine it
	const result = I18nContext.run('seed', () => interceptor.intercept(context, next as never));
	return { locale, result };
}

describe('HeaderResolver', () => {
	const resolver = new HeaderResolver(['x-selected-language', 'accept-language']);

	it('resolves a single header name', () => {
		expect(resolver.resolve(httpContext({ headers: { 'x-selected-language': 'ru' } }))).toBe(
			'ru'
		);
	});

	it('tries headers in order — first match wins', () => {
		const ctx = httpContext({
			headers: {
				'x-selected-language': 'de',
				'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8'
			}
		});
		expect(resolver.resolve(ctx)).toBe('de');
	});

	it('falls through to the next header', () => {
		const ctx = httpContext({
			headers: { 'accept-language': 'fr-FR,fr;q=0.9' }
		});
		expect(resolver.resolve(ctx)).toBe('fr-FR');
	});

	it('accepts an array header value', () => {
		expect(
			new HeaderResolver('accept-language').resolve(
				httpContext({ headers: { 'accept-language': ['ru', 'en'] } })
			)
		).toBe('ru');
	});

	it('returns undefined for non-HTTP contexts', () => {
		expect(resolver.resolve(rpcContext())).toBeUndefined();
	});

	it('returns undefined when no header matches', () => {
		expect(resolver.resolve(httpContext({ headers: {} }))).toBeUndefined();
	});
});

describe('QueryResolver', () => {
	it('reads the configured query param', () => {
		expect(new QueryResolver('lang').resolve(httpContext({ query: { lang: 'ru' } }))).toBe(
			'ru'
		);
	});

	it('returns undefined when the param is absent', () => {
		expect(new QueryResolver('lang').resolve(httpContext({ query: {} }))).toBeUndefined();
	});
});

describe('ParamResolver', () => {
	it('reads the configured route param', () => {
		expect(new ParamResolver('locale').resolve(httpContext({ params: { locale: 'de' } }))).toBe(
			'de'
		);
	});
});

describe('CookieResolver', () => {
	it('reads the configured cookie', () => {
		expect(
			new CookieResolver('i18n_lang').resolve(httpContext({ cookies: { i18n_lang: 'ru' } }))
		).toBe('ru');
	});

	it('returns undefined without cookies or a Cookie header', () => {
		expect(new CookieResolver('i18n_lang').resolve(httpContext({}))).toBeUndefined();
	});

	it('parses the raw Cookie header without cookie-parser', () => {
		const ctx = httpContext({
			headers: { cookie: 'theme=dark; i18n_lang=ru-RU; other=1' }
		});
		expect(new CookieResolver('i18n_lang').resolve(ctx)).toBe('ru-RU');
	});
});

describe('I18nInterceptor', () => {
	it('binds the first matching resolver locale to I18nContext', () => {
		const ctx = httpContext({
			query: { lang: 'ru' },
			params: { locale: 'de' }
		});
		const { locale, result } = interceptorWith(
			[new ParamResolver('locale'), new QueryResolver('lang')],
			ctx
		);

		expect(locale).toBe('de'); // ParamResolver is first in the chain
		expect(result).toBe('handled');
	});

	it('falls through resolvers that return undefined', () => {
		const ctx = httpContext({ headers: { 'x-selected-language': 'fr' } });
		const { locale } = interceptorWith(
			[new CookieResolver('lang'), new HeaderResolver('x-selected-language')],
			ctx
		);
		expect(locale).toBe('fr');
	});

	it('supports custom resolvers for non-HTTP frameworks', () => {
		const discordResolver: I18nResolver = {
			resolve: context => {
				// stands in for NecordExecutionContext.create(context)
				return (context as any).interaction?.locale;
			}
		};
		const ctx = { interaction: { locale: 'ru' } } as unknown as ExecutionContext;

		const { locale } = interceptorWith([discordResolver], ctx);
		expect(locale).toBe('ru');
	});

	it('continues to the next resolver when one throws', () => {
		const badResolver: I18nResolver = {
			resolve: () => {
				throw new Error('boom');
			}
		};
		const ctx = httpContext({ query: { lang: 'es' } });

		const { locale } = interceptorWith([badResolver, new QueryResolver('lang')], ctx);
		expect(locale).toBe('es');
	});

	it('does not set a context locale when nothing resolves', () => {
		const ctx = httpContext({ headers: {} });
		const { locale } = interceptorWith([new HeaderResolver('x-lang')], ctx);
		expect(locale).toBe('seed');
	});
});
