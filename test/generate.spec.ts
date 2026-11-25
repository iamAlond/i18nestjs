import { extractArgs, generateTypesDeclaration } from '../src/generate';

describe('extractArgs', () => {
	it('returns empty object for static messages', () => {
		expect(extractArgs('Just text')).toEqual({});
	});

	it('extracts simple arguments as string | number', () => {
		expect(extractArgs('Hello {name}!')).toEqual({ name: 'string | number' });
	});

	it('extracts plural arguments as number', () => {
		const args = extractArgs('{count, plural, one {# item} other {# items}}');
		expect(args).toEqual({ count: 'number' });
	});

	it('extracts select arguments as a union of branch selectors', () => {
		const args = extractArgs('{gender, select, male {He} female {She} other {They}}');
		expect(args).toEqual({ gender: '"male" | "female" | "other"' });
	});

	it('unions types when an argument is used in several ICU forms', () => {
		const args = extractArgs('{x} {x, select, a {A} other {B}}');
		expect(args?.x).toBe('string | number | "a" | "other"');
	});

	it('extracts date/time arguments as Date | number', () => {
		expect(extractArgs('Due {due, date, short}')).toEqual({ due: 'Date | number' });
		expect(extractArgs('At {at, time, short}')).toEqual({ at: 'Date | number' });
	});

	it('extracts number skeleton arguments as number', () => {
		expect(extractArgs('Price {price, number, ::currency/USD}')).toEqual({
			price: 'number'
		});
	});

	it('collects arguments nested inside plural/select cases', () => {
		const args = extractArgs(
			'{count, plural, one {Hello {name}, # item} other {Hello {name}, # items}}'
		);
		expect(args).toEqual({ count: 'number', name: 'string | number' });
	});

	it('returns null for invalid ICU syntax', () => {
		expect(extractArgs('{unclosed')).toBeNull();
	});
});

describe('generateTypesDeclaration', () => {
	it('generates module augmentation with keys and args', () => {
		const messages = new Map<string, string>([
			['hello', 'Hello {name}!'],
			['items', '{count, plural, one {# item} other {# items}}'],
			['static', 'Text']
		]);

		const output = generateTypesDeclaration(messages);
		expect(output).toContain("declare module 'i18nestjs'");
		expect(output).toContain('interface I18nTypes');
		expect(output).toContain('"hello"');
		expect(output).toContain('"items"');
		expect(output).toContain('"count": number');
		expect(output).toContain('"name": string | number');
		// static key has no args entry
		expect(output).not.toContain('"static": {');
	});

	it('emits select selector unions in the declaration', () => {
		const messages = new Map<string, string>([
			['invited', '{gender, select, male {He} female {She} other {They}} invited you']
		]);
		const output = generateTypesDeclaration(messages);
		expect(output).toContain('"gender": "male" | "female" | "other"');
	});

	it('ends with `export {}` so the declaration acts as module augmentation', () => {
		const output = generateTypesDeclaration(new Map([['hello', 'Hello {name}!']]));
		expect(output.trimEnd().endsWith('export {};')).toBe(true);
	});

	it('handles empty message sets', () => {
		const output = generateTypesDeclaration(new Map());
		expect(output).toContain('keys: never');
	});
});
