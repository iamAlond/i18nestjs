import { MessageCompiler } from '../src/compiler';

describe('MessageCompiler', () => {
	it('interpolates simple arguments', () => {
		const c = new MessageCompiler();
		expect(c.format('Hello {name}!', 'en', { name: 'World' })).toBe('Hello World!');
	});

	it('selects English plural forms', () => {
		const c = new MessageCompiler();
		const msg = '{count, plural, one {# item} other {# items}}';
		expect(c.format(msg, 'en', { count: 1 })).toBe('1 item');
		expect(c.format(msg, 'en', { count: 5 })).toBe('5 items');
	});

	it('selects Russian plural forms via CLDR rules', () => {
		const c = new MessageCompiler();
		const msg = '{count, plural, one {# вещь} few {# вещи} many {# вещей} other {# вещи}}';
		expect(c.format(msg, 'ru', { count: 1 })).toBe('1 вещь');
		expect(c.format(msg, 'ru', { count: 3 })).toBe('3 вещи');
		expect(c.format(msg, 'ru', { count: 5 })).toBe('5 вещей');
		expect(c.format(msg, 'ru', { count: 22 })).toBe('22 вещи');
	});

	it('formats numbers and dates', () => {
		const c = new MessageCompiler();
		expect(c.format('Price: {price, number, ::currency/USD}', 'en', { price: 9.99 })).toContain(
			'$'
		);
		expect(
			c.format('Due {due, date, short}', 'en', { due: new Date('2026-01-15T12:00:00Z') })
		).toContain('1/15/26');
	});

	it('supports select arguments', () => {
		const c = new MessageCompiler();
		const msg = '{gender, select, male {He} female {She} other {They}}';
		expect(c.format(msg, 'en', { gender: 'female' })).toBe('She');
	});

	it('returns the raw message and reports on invalid ICU syntax', () => {
		const errors: string[] = [];
		const c = new MessageCompiler((e, m) => errors.push(`${m}:${(e as Error).message}`));
		expect(c.format('{unclosed', 'en')).toBe('{unclosed');
		expect(errors.length).toBeGreaterThan(0);
	});

	it('caches compiled messages and clears the cache', () => {
		const c = new MessageCompiler();
		c.format('Hello {name}', 'en', { name: 'A' });
		c.format('Hello {name}', 'en', { name: 'B' }); // cache hit
		c.clear();
		expect(c.format('Hello {name}', 'en', { name: 'C' })).toBe('Hello C');
	});
});
