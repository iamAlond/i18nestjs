import { ExecutionContext } from '@nestjs/common';
import { baseLanguage, normalizeLocale } from './locales';

/** Result of {@link I18nResolver.resolve} — sync or async locale. */
export type I18nResolverResult = string | undefined | Promise<string | undefined>;

/**
 * Strategy that extracts a locale from an execution context. The first
 * resolver in `I18nModuleOptions.resolvers` returning a non-empty string
 * wins; its value is bound to `I18nContext` for the rest of the request.
 * `resolve` may be async — e.g. to load the user's locale from Redis or
 * a database by `req.user.id` (guards run before interceptors, so
 * `req.user` is already populated).
 *
 * The optional `locales` argument contains the canonical locale codes
 * currently loaded by the module — resolvers may use it to pick the
 * best match (e.g. `HeaderResolver` skips `Accept-Language` entries
 * that have no matching locale). Custom resolvers can ignore it.
 *
 * Built-in resolvers cover HTTP. For other frameworks (Discord/necord,
 * Telegram bots, queues, ...) implement this interface yourself — the
 * context is the standard Nest `ExecutionContext`, unwrap it with the
 * framework's own helper (e.g. `NecordExecutionContext.create(context)`).
 *
 * @example
 * ```ts
 * @Injectable()
 * class DiscordLocaleResolver implements I18nResolver {
 *   resolve(context: ExecutionContext): string | undefined {
 *     const [interaction] = NecordExecutionContext.create(context).getContext();
 *     return interaction?.locale;
 *   }
 * }
 *
 * @Injectable()
 * class UserLocaleResolver implements I18nResolver {
 *   constructor(private readonly users: UsersService) {}
 *
 *   async resolve(context: ExecutionContext) {
 *     const request = context.switchToHttp().getRequest();
 *     const user = await this.users.findById(request.user?.id);
 *     return user?.locale;
 *   }
 * }
 * ```
 */
export interface I18nResolver {
	resolve(context: ExecutionContext, locales?: ReadonlySet<string>): I18nResolverResult;
}

/**
 * Parses an `Accept-Language` header value into locale tags ordered by
 * descending `q` weight (stable for equal weights). Entries with `q=0`,
 * the `*` wildcard and malformed tags are skipped.
 */
function parseAcceptLanguage(value: string): string[] {
	return value
		.split(',')
		.map(part => {
			const [tag, ...params] = part.split(';').map(piece => piece.trim());
			let q = 1;
			for (const param of params) {
				const [key, raw] = param.split('=');
				if (key?.trim().toLowerCase() === 'q') {
					const parsed = Number.parseFloat(raw ?? '');
					// An unparsable q means the entry is unacceptable (RFC 9110)
					q = Number.isNaN(parsed) ? 0 : parsed;
				}
			}
			return { tag: tag ?? '', q };
		})
		.filter(entry => entry.tag !== '' && entry.tag !== '*' && entry.q > 0)
		.sort((a, b) => b.q - a.q)
		.map(entry => entry.tag);
}

/**
 * Whether a requested tag can be served by the loaded locales — either
 * exactly (`pt-BR` → `pt-BR/`) or via base language (`pt-BR` → `pt/`).
 */
function matchesLoadedLocale(tag: string, locales: ReadonlySet<string>): boolean {
	const normalized = normalizeLocale(tag);
	if (locales.has(normalized)) return true;
	const base = baseLanguage(normalized);
	return base !== undefined && locales.has(base);
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === 'string') return value || undefined;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0] || undefined;
	return undefined;
}

/** HTTP request object, or `undefined` for non-HTTP contexts. */
function httpRequest(context: ExecutionContext): Record<string, any> | undefined {
	if (context.getType() !== 'http') return undefined;
	try {
		return context.switchToHttp().getRequest();
	} catch {
		return undefined;
	}
}

/**
 * Resolves locale from request headers. Accepts a single header name or
 * a list — the first header that yields a value wins, so order expresses
 * priority (e.g. a custom `x-selected-language` before `accept-language`).
 *
 * `Accept-Language` values are fully parsed: entries are ordered by `q`
 * weight and the first tag matching a loaded locale wins — so
 * `fr-CH,fr;q=0.9,en;q=0.8` resolves to `en` when only `en`/`ru` exist.
 * Without a `locales` set the first tag by weight is returned.
 */
export class HeaderResolver implements I18nResolver {
	private readonly names: string[];

	constructor(headers: string | string[]) {
		this.names = (Array.isArray(headers) ? headers : [headers]).map(name => name.toLowerCase());
	}

	resolve(context: ExecutionContext, locales?: ReadonlySet<string>): string | undefined {
		const request = httpRequest(context);
		if (!request?.headers) return undefined;

		for (const name of this.names) {
			const value = stringValue(request.headers[name]);
			if (!value) continue;

			for (const tag of parseAcceptLanguage(value)) {
				if (!locales || matchesLoadedLocale(tag, locales)) return tag;
			}
		}
		return undefined;
	}
}

/** Resolves locale from a query parameter, e.g. `?lang=ru`. */
export class QueryResolver implements I18nResolver {
	constructor(private readonly param: string) {}

	resolve(context: ExecutionContext): string | undefined {
		const request = httpRequest(context);
		return request?.query ? stringValue(request.query[this.param]) : undefined;
	}
}

/** Resolves locale from a route parameter, e.g. `/users/:locale`. */
export class ParamResolver implements I18nResolver {
	constructor(private readonly param: string) {}

	resolve(context: ExecutionContext): string | undefined {
		const request = httpRequest(context);
		return request?.params ? stringValue(request.params[this.param]) : undefined;
	}
}

/** Cookie value from `req.cookies` (cookie-parser) or the raw `Cookie` header. */
function cookieValue(request: Record<string, any>, name: string): string | undefined {
	const fromParser = stringValue(request.cookies?.[name]);
	if (fromParser) return fromParser;

	const header = stringValue(request.headers?.cookie);
	if (!header) return undefined;

	for (const pair of header.split(';')) {
		const eq = pair.indexOf('=');
		if (eq === -1) continue;
		if (pair.slice(0, eq).trim() === name) {
			try {
				return decodeURIComponent(pair.slice(eq + 1).trim()) || undefined;
			} catch {
				return pair.slice(eq + 1).trim() || undefined;
			}
		}
	}
	return undefined;
}

/** Resolves locale from a cookie — works with or without cookie-parser. */
export class CookieResolver implements I18nResolver {
	constructor(private readonly name: string) {}

	resolve(context: ExecutionContext): string | undefined {
		const request = httpRequest(context);
		return request ? cookieValue(request, this.name) : undefined;
	}
}
