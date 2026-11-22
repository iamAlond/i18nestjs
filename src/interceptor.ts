import {
	CallHandler,
	ExecutionContext,
	Inject,
	Injectable,
	Logger,
	NestInterceptor
} from '@nestjs/common';
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
 */
@Injectable()
export class I18nInterceptor implements NestInterceptor {
	private readonly logger = new Logger(I18nInterceptor.name);

	constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: I18nModuleOptions) {}

	intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
		for (const resolver of this.options.resolvers ?? []) {
			let locale: string | undefined;
			try {
				locale = resolver.resolve(context);
			} catch (error) {
				this.logger.warn(
					`I18nResolver "${resolver.constructor?.name ?? 'anonymous'}" threw: ${
						(error as Error).message
					}`
				);
				continue;
			}

			if (locale) {
				I18nContext.enterWith(normalizeLocale(locale));
				break;
			}
		}

		return next.handle();
	}
}
