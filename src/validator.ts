import { I18nService } from './service';
import { I18nCallParams, I18nKey } from './types';

/**
 * Type-safe `class-validator` message factory. Returns a function in the
 * shape class-validator expects for the `message` option — it is invoked
 * during validation, inside the request's async context, so `I18nContext`
 * (locale resolvers) and `I18nService` are already available and the
 * message is translated in the user's locale immediately.
 *
 * Keys and arguments are fully type-checked against the generated
 * `I18nTypes` — a typo in the key or a missing/extra ICU argument is a
 * compile error.
 *
 * @example
 * ```ts
 * import { IsEmail, MinLength } from 'class-validator';
 * import { i18nMessage } from 'i18nestjs';
 *
 * export class CreateUserDto {
 *   @IsEmail({}, { message: i18nMessage('validation.invalidEmail') })
 *   email!: string;
 *
 *   @MinLength(8, { message: i18nMessage('validation.minLength', { min: 8 }) })
 *   password!: string;
 * }
 * ```
 *
 * class-validator placeholders keep working: pass the literal `'$property'`
 * or `'$value'` as an ICU argument and they are substituted in the final
 * message, e.g. `i18nMessage('validation.required', { field: '$property' })`.
 *
 * When the module is not initialized (e.g. `validate()` outside a Nest
 * context), the raw key is returned.
 */
export function i18nMessage<K extends I18nKey>(
	key: K,
	...params: I18nCallParams<K>
): (args?: unknown) => string {
	const options = params[0];
	return () => {
		const service = I18nService.active;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc rejects the tuple without the cast
		return service ? service.t(key, options as never) : key;
	};
}
