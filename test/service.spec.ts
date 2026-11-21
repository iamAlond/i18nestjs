import path from 'node:path';
import { I18nModuleOptions } from '../src/options';
import { I18nService } from '../src/service';
import { JsonLoader } from '../src/loader';
import fs from 'node:fs';
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

describe('I18nService', () => {
	let dir: string;

	beforeEach(() => {
		dir = createFixture({
			en: {
				'common.json': {
					hello: 'Hello {name}!',
					items: '{count, plural, one {# item} other {# items}}',
					nested: { deep: { bye: 'Bye {name}' } },
					onlyEn: 'English only'
				}
			},
			uk: {
				'common.json': {
					hello: 'Привіт {name}!',
					items: '{count, plural, one {# річ} few {# речі} many {# речей} other {# речі}}',
					nested: { deep: { bye: 'Бувай {name}' } }
				}
			}
		});
	});

	afterEach(() => {
		removeFixture(dir);
	});

	it('translates with argument interpolation', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('hello', { name: 'World' })).toBe('Hello World!');
	});

	it('flattens nested objects into dot keys', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('nested.deep.bye', { name: 'X' })).toBe('Bye X');
	});

	it('resolves locale per call', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('hello', { name: 'Світ', locale: 'uk' })).toBe('Привіт Світ!');
	});

	it('applies CLDR plural rules for the message locale', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('items', { count: 1 })).toBe('1 item');
		expect(svc.t('items', { count: 5, locale: 'uk' })).toBe('5 речей');
	});

	it('falls back to fallbackLanguage for missing keys', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('onlyEn', { locale: 'uk' })).toBe('English only');
	});

	it('returns the key for missing keys by default', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('no.such.key')).toBe('no.such.key');
	});

	it('supports defaultValue for missing keys', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('no.such.key', { defaultValue: 'Fallback text' })).toBe('Fallback text');
	});

	it('throws on missing keys when missingKey is throw', () => {
		const svc = createService(dir, { missingKey: 'throw' });
		svc.onModuleInit();
		expect(() => svc.t('no.such.key')).toThrow('no.such.key');
	});

	it('returns the key when debug is set', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('hello', { name: 'X', debug: true })).toBe('hello');
	});

	it('fails strict mode when a locale misses fallback keys', () => {
		const strictDir = createFixture({
			en: { 'a.json': { one: 'One', two: 'Two' } },
			de: { 'a.json': { one: 'Eins' } }
		});
		const svc = createService(strictDir, { strict: true });
		expect(() => svc.onModuleInit()).toThrow(/strict mode/);
		expect(() => svc.onModuleInit()).toThrow(/"two"/);
		removeFixture(strictDir);
	});

	it('passes strict mode when all locales have all keys', () => {
		const strictDir = createFixture({
			en: { 'a.json': { one: 'One' } },
			de: { 'a.json': { one: 'Eins' } }
		});
		const svc = createService(strictDir, { strict: true });
		expect(() => svc.onModuleInit()).not.toThrow();
		removeFixture(strictDir);
	});

	it('supports namespaceByFile', () => {
		const nsDir = createFixture({
			en: { 'user.json': { profile: { name: 'Name' } } }
		});
		const svc = createService(nsDir, { namespaceByFile: true });
		svc.onModuleInit();
		expect(svc.t('user.profile.name')).toBe('Name');
		removeFixture(nsDir);
	});

	it('exposes locales and raw messages', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.getLocales().sort()).toEqual(['en', 'uk']);
		expect(svc.getMessage('en', 'hello')).toBe('Hello {name}!');
		expect(svc.has('hello', 'uk')).toBe(true);
		expect(svc.has('onlyEn', 'uk')).toBe(true); // via fallback
	});

	it('withLocale binds a locale for subsequent calls', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		const uk = svc.withLocale('uk');
		expect(uk.t('hello', { name: 'Світ' })).toBe('Привіт Світ!');
	});

	it('reloads translations from disk', () => {
		const svc = createService(dir);
		svc.onModuleInit();
		expect(svc.t('hello', { name: 'A' })).toBe('Hello A!');

		fs.writeFileSync(
			path.join(dir, 'en', 'common.json'),
			JSON.stringify({ hello: 'Hi {name}!', items: '', nested: { deep: { bye: '' } } })
		);
		svc.reload();
		expect(svc.t('hello', { name: 'A' })).toBe('Hi A!');
	});
});
