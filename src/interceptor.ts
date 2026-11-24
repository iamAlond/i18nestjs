import {
	CallHandler,
	ExecutionContext,
	Inject,
	Injectable,
	Logger,
	NestInterceptor
} from '@nestjs/common';
import { from, mergeMap } from 'rxjs';
import { I18nContext } from './context';
import { normalizeLocale } from './locales';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import { I18nModuleOptions } from './options';

/**
 * Global interceptor that resolves the request locale through the
 * configured `I18nResolver` chain and binds it to `I18nContext`, so every
 * `I18nService.t()` call inside the handler (and anything it awaits)
 * uses it automatically. Registered automatically by `I18nModule`;
 * a no-op when no resolvers are configured.
 *
 * Resolvers may be async — the handler is deferred until the chain
 * settles. The locale is bound inside the subscription context, so it
 * propagates to the whole downstream pipeline.
 */
@Injectable()
export class I18nInterceptor implements NestInterceptor {
	private readonly logger = new Logger(I18nInterceptor.name);

	constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: I18nModuleOptions) {}

	intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
		return from(this.resolveLocale(context)).pipe(
			mergeMap(locale => {
				if (locale) {
					I18nContext.enterWith(normalizeLocale(locale));
				}
				return next.handle();
			})
		);
	}

	/** Runs the resolver chain; returns the winning locale, if any. */
	private async resolveLocale(context: ExecutionContext): Promise<string | undefined> {
		for (const resolver of this.options.resolvers ?? []) {
			let locale: string | undefined;
			try {
				locale = await resolver.resolve(context);
			} catch (error) {
				this.logger.warn(
					`I18nResolver "${resolver.constructor?.name ?? 'anonymous'}" threw: ${
						(error as Error).message
					}`
				);
				continue;
			}

			if (locale) return locale;
		}
		return undefined;
	}
}
