import {
	explicitChain,
	localeChain,
	normalizeFallbacks,
	normalizeLocale,
	normalizeLocaleMessages
} from '../src/locales';
import { LocaleMessages } from '../src/scan';

describe('normalizeLocale', () => {
	it('canonicalizes case and separators', () => {
		expect(normalizeLocale('de-at')).toBe('de-AT');
		expect(normalizeLocale('DE_at')).toBe('de-AT');
		expect(normalizeLocale('en')).toBe('en');
	});

	it('returns input for invalid tags', () => {
		expect(normalizeLocale('not a locale!!')).toBe('not a locale!!');
	});
});

describe('normalizeFallbacks', () => {
	it('canonicalizes keys and values', () => {
		const map = normalizeFallbacks({ 'de-at': 'de', ZH_cn: 'zh' });
		expect(map.get('de-AT')).toBe('de');
		expect(map.get('zh-CN')).toBe('zh');
	});
});

describe('normalizeLocaleMessages', () => {
	it('merges locales that canonicalize to the same tag', () => {
		const input: LocaleMessages = new Map([
			['de-at', new Map([['a', '1']])],
			['de-AT', new Map([['b', '2']])]
		]);
		const warnings: string[] = [];
		const result = normalizeLocaleMessages(input, m => warnings.push(m));
		expect(result.size).toBe(1);
		expect(result.get('de-AT')?.get('a')).toBe('1');
		expect(result.get('de-AT')?.get('b')).toBe('2');
		expect(warnings.length).toBe(1);
	});
});

describe('localeChain', () => {
	const fallbacks = normalizeFallbacks({ 'de-AT': 'de', 'de-CH': 'de', 'zh-CN': 'zh' });

	it('builds requested → fallbacks → terminal chain', () => {
		expect(localeChain('de-AT', fallbacks, 'en')).toEqual(['de-AT', 'de', 'en']);
	});

	it('appends terminal when no explicit fallbacks', () => {
		expect(localeChain('fr', fallbacks, 'en')).toEqual(['fr', 'en']);
	});

	it('supports transitive chains', () => {
		const fb = normalizeFallbacks({ 'de-AT': 'de-CH', 'de-CH': 'de' });
		expect(localeChain('de-AT', fb, 'en')).toEqual(['de-AT', 'de-CH', 'de', 'en']);
	});

	it('is cycle-safe', () => {
		const fb = normalizeFallbacks({ 'de-AT': 'de-CH', 'de-CH': 'de-AT' });
		expect(localeChain('de-AT', fb, 'en')).toEqual(['de-AT', 'de-CH', 'en']);
	});

	it('does not duplicate terminal', () => {
		const fb = normalizeFallbacks({ 'de-AT': 'en' });
		expect(localeChain('de-AT', fb, 'en')).toEqual(['de-AT', 'en']);
	});

	it('falls back to base language subtag by default', () => {
		expect(localeChain('pt-BR', fallbacks, 'en')).toEqual(['pt-BR', 'pt', 'en']);
		expect(localeChain('zh-Hant-TW', fallbacks, 'en')).toEqual(['zh-Hant-TW', 'zh', 'en']);
	});

	it('explicit fallbacks take precedence over base language', () => {
		const fb = normalizeFallbacks({ 'pt-BR': 'pt-PT' });
		expect(localeChain('pt-BR', fb, 'en')).toEqual(['pt-BR', 'pt-PT', 'pt', 'en']);
	});

	it('base fallback applies to every hop of the chain', () => {
		const fb = normalizeFallbacks({ 'de-AT': 'de-CH' });
		expect(localeChain('de-AT', fb, 'en')).toEqual(['de-AT', 'de-CH', 'de', 'en']);
	});

	it('can be disabled', () => {
		expect(localeChain('pt-BR', fallbacks, 'en', false)).toEqual(['pt-BR', 'en']);
	});

	it('does not add base step for base locales', () => {
		expect(localeChain('de', fallbacks, 'en')).toEqual(['de', 'en']);
	});
});

describe('explicitChain', () => {
	const fallbacks = normalizeFallbacks({ 'de-AT': 'de' });

	it('excludes the terminal fallback language', () => {
		expect(explicitChain('de-AT', fallbacks, 'en')).toEqual(['de-AT', 'de']);
		expect(explicitChain('fr', fallbacks, 'en')).toEqual(['fr']);
		expect(explicitChain('en', fallbacks, 'en')).toEqual([]);
	});
});
