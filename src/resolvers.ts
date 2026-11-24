import { ExecutionContext } from '@nestjs/common';

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
	resolve(context: ExecutionContext): I18nResolverResult;
}

/** First entry of an `Accept-Language`-style header value. */
function firstLocaleTag(value: string): string | undefined {
	const first = value.split(',')[0]?.split(';')[0]?.trim();
	return first || undefined;
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
 * Comma-separated values (`Accept-Language`) resolve to the first tag.
 */
export class HeaderResolver implements I18nResolver {
	private readonly names: string[];

	constructor(headers: string | string[]) {
		this.names = (Array.isArray(headers) ? headers : [headers]).map(name => name.toLowerCase());
	}

	resolve(context: ExecutionContext): string | undefined {
		const request = httpRequest(context);
		if (!request?.headers) return undefined;

		for (const name of this.names) {
			const value = stringValue(request.headers[name]);
			if (value) {
				const locale = firstLocaleTag(value);
				if (locale) return locale;
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
