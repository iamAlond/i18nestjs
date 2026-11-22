import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const FIXTURE_FILES: Record<string, Record<string, unknown>> = {
	en: {
		'common.json': {
			hello: 'Hello {name}!',
			items: '{count, plural, one {# item} other {# items}}',
			onlyEn: 'English only'
		}
	},
	uk: {
		'common.json': {
			hello: 'Привіт {name}!',
			items: '{count, plural, one {# річ} few {# речі} many {# речей} other {# речі}}'
		}
	}
};

export function createFixture(
	files: Record<string, Record<string, unknown>> = FIXTURE_FILES
): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18nestjs-e2e-'));
	for (const [locale, content] of Object.entries(files)) {
		const localeDir = path.join(dir, locale);
		fs.mkdirSync(localeDir, { recursive: true });
		for (const [name, data] of Object.entries(content)) {
			fs.writeFileSync(path.join(localeDir, name), JSON.stringify(data));
		}
	}
	return dir;
}

export function removeFixture(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}
