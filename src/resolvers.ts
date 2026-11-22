import { ExecutionContext } from '@nestjs/common';

/**
 * Strategy that extracts a locale from an execution context. The first
 * resolver in `I18nModuleOptions.resolvers` returning a non-empty string
 * wins; its value is bound to `I18nContext` for the rest of the request.
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
 * ```
 */
export interface I18nResolver {
	resolve(context: ExecutionContext): string | undefined;
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

/** Resolves locale from a cookie. Requires cookie parsing upstream. */
export class CookieResolver implements I18nResolver {
	constructor(private readonly name: string) {}

	resolve(context: ExecutionContext): string | undefined {
		const request = httpRequest(context);
		return request?.cookies ? stringValue(request.cookies[this.name]) : undefined;
	}
}
