import { I18nContext } from '../src/context';
import { JsonLoader } from '../src/loader';
import { I18nModuleOptions } from '../src/options';
import { I18nService } from '../src/service';
import { i18nMessage } from '../src/validator';
import { createFixture, removeFixture } from './helpers';

function createService(localesPath: string, overrides: Partial<I18nModuleOptions> = {}) {
	const options: I18nModuleOptions = {
		fallbackLanguage: 'en',
		localesPath,
		watch: false,
		...overrides
	};
	return new I18nService(options, new JsonLoader(options));
}

describe('i18nMessage', () => {
	let dir: string;

	beforeEach(() => {
		dir = createFixture();
	});

	afterEach(() => {
		removeFixture(dir);
	});

	it('returns the raw key when no service is initialized', () => {
		I18nService.active = undefined;
		expect(i18nMessage('hello')()).toBe('hello');
	});

	it('translates in the current context locale', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const message = i18nMessage('hello', { name: 'World' });
		expect(I18nContext.run('ru', () => message())).toBe('Привет World!');
		expect(message()).toBe('Hello World!');
	});

	it('passes ICU arguments through', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const message = i18nMessage('items', { count: 5 });
		expect(I18nContext.run('ru', () => message())).toBe('5 вещей');
		expect(message()).toBe('5 items');
	});

	it('ignores class-validator validation arguments', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const message = i18nMessage('hello', { name: 'Ada' });
		// class-validator calls message(validationArguments) — shape is irrelevant
		expect(message({ value: 42, property: 'email', constraints: [] })).toBe('Hello Ada!');
	});

	it('honors per-call locale inside the message', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const message = i18nMessage('hello', { name: 'X', locale: 'ru' });
		expect(message()).toBe('Привет X!');
	});
});
