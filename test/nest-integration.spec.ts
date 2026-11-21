import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nModule } from '../src/module';
import { I18nModuleOptions } from '../src/options';
import { I18nService } from '../src/service';
import { createFixture, removeFixture } from './helpers';

describe('I18nModule (Nest DI integration)', () => {
	let localesPath: string;

	beforeEach(() => {
		localesPath = createFixture();
	});

	afterEach(() => {
		removeFixture(localesPath);
	});

	function baseOptions(overrides: Partial<I18nModuleOptions> = {}): I18nModuleOptions {
		return {
			fallbackLanguage: 'en',
			localesPath,
			watch: false,
			...overrides
		};
	}

	async function createModule(
		imports: Parameters<typeof Test.createTestingModule>[0]['imports']
	): Promise<TestingModule> {
		const moduleRef = await Test.createTestingModule({ imports }).compile();
		await moduleRef.init();
		return moduleRef;
	}

	it('provides I18nService via forRoot and translates', async () => {
		const moduleRef = await createModule([I18nModule.forRoot(baseOptions())]);
		const i18n = moduleRef.get(I18nService);

		expect(i18n.t('hello', { name: 'World' })).toBe('Hello World!');
		expect(i18n.t('hello', { name: 'Світ', locale: 'uk' })).toBe('Привіт Світ!');

		await moduleRef.close();
	});

	it('works as a global module', async () => {
		@Injectable()
		class Greeter {
			constructor(public readonly i18n: I18nService) {}
		}

		@Module({ providers: [Greeter] })
		class FeatureModule {}

		const moduleRef = await createModule([
			I18nModule.forRoot({ ...baseOptions(), isGlobal: true }),
			FeatureModule
		]);

		const greeter = moduleRef.get(Greeter);
		expect(greeter.i18n.t('onlyEn')).toBe('English only');

		await moduleRef.close();
	});

	it('supports forRootAsync with useFactory', async () => {
		const moduleRef = await createModule([
			I18nModule.forRootAsync({
				useFactory: () => baseOptions({ defaultLocale: 'uk' })
			})
		]);
		const i18n = moduleRef.get(I18nService);

		// defaultLocale uk -> Ukrainian message without explicit locale
		expect(i18n.t('hello', { name: 'Світ' })).toBe('Привіт Світ!');

		await moduleRef.close();
	});

	it('rejects initialization in strict mode on missing keys', async () => {
		removeFixture(localesPath);
		localesPath = createFixture({
			en: { 'a.json': { one: 'One', two: 'Two' } },
			de: { 'a.json': { one: 'Eins' } }
		});

		const moduleRef = await Test.createTestingModule({
			imports: [I18nModule.forRoot(baseOptions({ strict: true }))]
		}).compile();

		let initError: unknown;
		try {
			await moduleRef.init();
		} catch (error) {
			initError = error;
		}

		expect(initError).toBeInstanceOf(Error);
		expect((initError as Error).message).toMatch(/strict mode/);
		expect((initError as Error).message).toContain('"two"');
	});

	it('throws at translation time when missingKey is throw', async () => {
		const moduleRef = await createModule([
			I18nModule.forRoot(baseOptions({ missingKey: 'throw' }))
		]);
		const i18n = moduleRef.get(I18nService);

		expect(() => i18n.t('does.not.exist')).toThrow('does.not.exist');

		await moduleRef.close();
	});
});
