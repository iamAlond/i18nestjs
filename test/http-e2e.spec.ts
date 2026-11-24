import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { I18nContext } from '../src/context';
import { I18nModule } from '../src/module';
import { I18nModuleOptions } from '../src/options';
import { CookieResolver, HeaderResolver, QueryResolver } from '../src/resolvers';
import { I18nService } from '../src/service';
import { createFixture, removeFixture } from './helpers';

@Controller()
class I18nTestController {
	constructor(private readonly i18n: I18nService) {}

	@Get('hello')
	hello() {
		return { text: this.i18n.t('hello', { name: 'Test' }), locale: this.i18n.locale() };
	}

	@Get('context-check')
	contextCheck() {
		// proves ALS propagation deep inside the handler
		return { text: I18nContext.run('de', () => this.i18n.t('hello', { name: 'Inner' })) };
	}
}

describe('HTTP end-to-end (platform-express + supertest)', () => {
	let localesPath: string;
	let app: INestApplication;
	let moduleRef: TestingModule;

	const options = (overrides: Partial<I18nModuleOptions> = {}): I18nModuleOptions => ({
		fallbackLanguage: 'en',
		localesPath,
		watch: false,
		resolvers: [
			new CookieResolver('lang'),
			new QueryResolver('lang'),
			new HeaderResolver(['x-selected-language', 'accept-language'])
		],
		...overrides
	});

	beforeEach(async () => {
		localesPath = createFixture();
		moduleRef = await Test.createTestingModule({
			imports: [I18nModule.forRoot(options())],
			controllers: [I18nTestController]
		}).compile();
		app = moduleRef.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
		await moduleRef.close();
		removeFixture(localesPath);
	});

	it('resolves locale from Accept-Language header', async () => {
		const res = await request(app.getHttpServer())
			.get('/hello')
			.set('Accept-Language', 'ru-RU,ru;q=0.9,en;q=0.8');

		expect(res.status).toBe(200);
		// ru-RU → base fallback ru → Russian message
		expect(res.body.text).toBe('Привет Test!');
		expect(res.body.locale).toBe('ru-RU');
	});

	it('skips Accept-Language entries without a loaded locale', async () => {
		const res = await request(app.getHttpServer())
			.get('/hello')
			.set('Accept-Language', 'de-DE,de;q=0.9,ru;q=0.8');

		// de-* not loaded → next matching tag ru wins
		expect(res.body.text).toBe('Привет Test!');
		expect(res.body.locale).toBe('ru');
	});

	it('prefers x-selected-language over accept-language', async () => {
		const res = await request(app.getHttpServer())
			.get('/hello')
			.set('X-Selected-Language', 'en')
			.set('Accept-Language', 'ru');

		expect(res.body.text).toBe('Hello Test!');
	});

	it('resolves locale from query param', async () => {
		const res = await request(app.getHttpServer()).get('/hello?lang=ru');
		expect(res.body.text).toBe('Привет Test!');
	});

	it('resolves locale from cookie', async () => {
		const res = await request(app.getHttpServer())
			.get('/hello')
			.set('Cookie', 'lang=ru')
			.set('Accept-Language', 'en');

		expect(res.body.text).toBe('Привет Test!');
	});

	it('cookie beats query and headers (resolver order)', async () => {
		const res = await request(app.getHttpServer())
			.get('/hello?lang=en')
			.set('Cookie', 'lang=ru')
			.set('X-Selected-Language', 'en');

		expect(res.body.text).toBe('Привет Test!');
	});

	it('falls back to fallbackLanguage without any locale signal', async () => {
		const res = await request(app.getHttpServer()).get('/hello');
		expect(res.body.text).toBe('Hello Test!');
		expect(res.body.locale).toBe('en');
	});

	it('I18nContext propagates through the whole request lifecycle', async () => {
		const res = await request(app.getHttpServer())
			.get('/context-check')
			.set('Accept-Language', 'ru');

		// nested run('de') wins inside its scope, request locale unaffected outside
		expect(res.body.text).toBe('Hello Inner!');
	});

	it('supports async resolvers end-to-end', async () => {
		await app.close();
		await moduleRef.close();

		moduleRef = await Test.createTestingModule({
			imports: [
				I18nModule.forRoot(
					options({
						resolvers: [
							{
								resolve: async () => {
									await new Promise(resolve => setTimeout(resolve, 5));
									return 'ru';
								}
							}
						]
					})
				)
			],
			controllers: [I18nTestController]
		}).compile();
		app = moduleRef.createNestApplication();
		await app.init();

		const res = await request(app.getHttpServer()).get('/hello');
		expect(res.body.text).toBe('Привет Test!');
	});

	it('works without resolvers — plain fallback', async () => {
		await app.close();
		await moduleRef.close();

		moduleRef = await Test.createTestingModule({
			imports: [I18nModule.forRoot(options({ resolvers: [] }))],
			controllers: [I18nTestController]
		}).compile();
		app = moduleRef.createNestApplication();
		await app.init();

		const res = await request(app.getHttpServer()).get('/hello').set('Accept-Language', 'ru');

		expect(res.body.text).toBe('Hello Test!');
	});
});
