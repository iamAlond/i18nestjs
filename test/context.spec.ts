import { I18nContext } from '../src/context';
import { JsonLoader } from '../src/loader';
import { I18nModuleOptions } from '../src/options';
import { I18nService } from '../src/service';
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

describe('I18nContext', () => {
	it('exposes no locale outside of a context', () => {
		expect(I18nContext.locale()).toBeUndefined();
		expect(I18nContext.has()).toBe(false);
	});

	it('binds locale inside run() and restores it afterwards', () => {
		I18nContext.run('ru', () => {
			expect(I18nContext.locale()).toBe('ru');
			expect(I18nContext.has()).toBe(true);
		});
		expect(I18nContext.locale()).toBeUndefined();
	});

	it('supports nested run() calls', () => {
		I18nContext.run('ru', () => {
			I18nContext.run('de', () => {
				expect(I18nContext.locale()).toBe('de');
			});
			expect(I18nContext.locale()).toBe('ru');
		});
	});

	it('propagates locale through async boundaries', async () => {
		await I18nContext.run('ru', async () => {
			await new Promise(resolve => setTimeout(resolve, 1));
			expect(I18nContext.locale()).toBe('ru');
		});
	});

	it('enterWith() binds locale for the rest of the execution', () => {
		I18nContext.run('outer', () => {
			I18nContext.enterWith('de');
			expect(I18nContext.locale()).toBe('de');
		});
		// enterWith inside run() replaces the store for that context only
		expect(I18nContext.locale()).toBeUndefined();
	});
});

describe('I18nContext + I18nService', () => {
	let dir: string;

	beforeEach(() => {
		dir = createFixture({
			en: { 'common.json': { hello: 'Hello {name}!' } },
			ru: {
				'common.json': {
					hello: 'Привет {name}!',
					onlyRu: 'Только по-русски'
				}
			}
		});
	});

	afterEach(() => {
		removeFixture(dir);
	});

	it('t() picks up the context locale', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const result = I18nContext.run('ru', () => svc.t('hello', { name: 'Мир' }));
		expect(result).toBe('Привет Мир!');
	});

	it('explicit locale option wins over the context', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const result = I18nContext.run('ru', () => svc.t('hello', { name: 'World', locale: 'en' }));
		expect(result).toBe('Hello World!');
	});

	it('context locale propagates through nested async calls', async () => {
		const svc = createService(dir);
		svc.onModuleInit();

		const result = await I18nContext.run('ru', async () => {
			await Promise.resolve();
			return svc.t('hello', { name: 'Мир' });
		});
		expect(result).toBe('Привет Мир!');
	});

	it('locale() reports the effective context locale', () => {
		const svc = createService(dir, { defaultLocale: 'ru' });
		svc.onModuleInit();

		expect(svc.locale()).toBe('ru');
		expect(I18nContext.run('en', () => svc.locale())).toBe('en');
	});

	it('has() respects the context locale', () => {
		const svc = createService(dir);
		svc.onModuleInit();

		// 'onlyRu' exists only in ru — inside en context it is missing
		expect(I18nContext.run('en', () => svc.has('onlyRu'))).toBe(false);
		expect(I18nContext.run('ru', () => svc.has('onlyRu'))).toBe(true);
	});
});
