import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanLocales } from '../src/scan';

function writeJson(dir: string, locale: string, file: string, data: unknown): void {
	const target = path.join(dir, locale, file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, JSON.stringify(data));
}

describe('scanLocales', () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18nestjs-scan-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it('flattens nested JSON into dot keys', () => {
		writeJson(dir, 'en', 'common.json', { a: { b: { c: 'deep' } }, flat: 'top' });
		const result = scanLocales(dir);
		expect(result.get('en')?.get('a.b.c')).toBe('deep');
		expect(result.get('en')?.get('flat')).toBe('top');
	});

	it('supports flat dot-notation keys in JSON', () => {
		writeJson(dir, 'en', 'common.json', { 'a.b.c': 'flat-dot' });
		const result = scanLocales(dir);
		expect(result.get('en')?.get('a.b.c')).toBe('flat-dot');
	});

	it('merges multiple files per locale', () => {
		writeJson(dir, 'en', 'a.json', { one: '1' });
		writeJson(dir, 'en', 'nested/b.json', { two: '2' });
		const result = scanLocales(dir);
		expect(result.get('en')?.size).toBe(2);
	});

	it('prefixes keys with file namespace when namespaceByFile is set', () => {
		writeJson(dir, 'en', 'user.json', { profile: { name: 'Name' } });
		writeJson(dir, 'en', 'admin/panel.json', { title: 'Admin' });
		const result = scanLocales(dir, { namespaceByFile: true });
		expect(result.get('en')?.get('user.profile.name')).toBe('Name');
		expect(result.get('en')?.get('admin.panel.title')).toBe('Admin');
	});

	it('warns on duplicate keys', () => {
		writeJson(dir, 'en', 'a.json', { dup: 'first' });
		writeJson(dir, 'en', 'b.json', { dup: 'second' });
		const warnings: string[] = [];
		const result = scanLocales(dir, { onWarn: m => warnings.push(m) });
		expect(result.get('en')?.get('dup')).toBe('second');
		expect(warnings.some(w => w.includes('Duplicate'))).toBe(true);
	});

	it('skips invalid JSON with a warning', () => {
		fs.mkdirSync(path.join(dir, 'en'), { recursive: true });
		fs.writeFileSync(path.join(dir, 'en', 'bad.json'), '{invalid');
		writeJson(dir, 'en', 'good.json', { ok: 'yes' });
		const warnings: string[] = [];
		const result = scanLocales(dir, { onWarn: m => warnings.push(m) });
		expect(result.get('en')?.get('ok')).toBe('yes');
		expect(warnings.some(w => w.includes('Failed to parse'))).toBe(true);
	});

	it('warns on non-string leaf values', () => {
		writeJson(dir, 'en', 'a.json', { num: 42, arr: [1, 2], ok: 'fine' });
		const warnings: string[] = [];
		const result = scanLocales(dir, { onWarn: m => warnings.push(m) });
		expect(result.get('en')?.get('ok')).toBe('fine');
		expect(result.get('en')?.has('num')).toBe(false);
		expect(warnings.length).toBeGreaterThanOrEqual(2);
	});

	it('returns empty map for missing directory', () => {
		const warnings: string[] = [];
		const result = scanLocales(path.join(dir, 'nope'), { onWarn: m => warnings.push(m) });
		expect(result.size).toBe(0);
		expect(warnings.length).toBe(1);
	});
});
