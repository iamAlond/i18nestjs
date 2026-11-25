import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { generateTypesDeclaration } from '../src/generate';

const repoRoot = resolve(__dirname, '..');
const tscBin = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

/**
 * End-to-end check that the generated declaration file behaves as a module
 * augmentation under `moduleResolution: nodenext`. Without a top-level
 * `export {}` the file is a script, `declare module 'i18nestjs'` shadows the
 * real package types, and imports like `I18nModule` stop resolving.
 */
describe('generated types declaration (nodenext consumer)', () => {
	let workDir: string;

	beforeAll(() => {
		workDir = mkdtempSync(join(repoRoot, '.tmp-i18n-e2e-'));

		writeFileSync(
			join(workDir, 'tsconfig.json'),
			JSON.stringify(
				{
					compilerOptions: {
						module: 'nodenext',
						moduleResolution: 'nodenext',
						strict: true,
						strictPropertyInitialization: false,
						skipLibCheck: true,
						noEmit: true,
						experimentalDecorators: true,
						emitDecoratorMetadata: true,
						types: ['node'],
						paths: { i18nestjs: ['../src/index.ts'] }
					},
					include: ['*.ts']
				},
				null,
				'\t'
			)
		);

		writeFileSync(
			join(workDir, 'consumer.ts'),
			[
				"import { I18nKey, I18nModule, I18nService } from 'i18nestjs';",
				'',
				'// Package exports must still resolve — the declaration must augment, not shadow.',
				'void I18nModule;',
				'void I18nService;',
				'',
				"const key: I18nKey = 'hello';",
				'void key;',
				'',
				'// @ts-expect-error — not a generated key',
				"const bad: I18nKey = 'bogus';",
				'void bad;'
			].join('\n')
		);

		const declaration = generateTypesDeclaration(
			new Map([
				['hello', 'Hello {name}!'],
				['items', '{count, plural, one {# item} other {# items}}']
			])
		);
		writeFileSync(join(workDir, 'i18n.types.d.ts'), declaration);
	});

	afterAll(() => {
		rmSync(workDir, { recursive: true, force: true });
	});

	it('compiles a nodenext consumer with the generated declaration', () => {
		// tsc exits non-zero and prints diagnostics on failure; execFileSync throws.
		execFileSync(process.execPath, [tscBin, '-p', join(workDir, 'tsconfig.json')], {
			cwd: repoRoot,
			stdio: 'pipe'
		});
	}, 60_000);
});
