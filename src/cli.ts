#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { extractArgs, generateTypesDeclaration } from './generate';
import {
	explicitChain,
	normalizeFallbacks,
	normalizeLocale,
	normalizeLocaleMessages
} from './locales';
import { scanLocales } from './scan';

const USAGE = `i18nestjs — CLI for the i18nestjs NestJS i18n package

Usage:
  i18nestjs types [options]     Generate TypeScript types from translations
  i18nestjs validate [options]  Validate locales against the fallback language

Options:
  -p, --path <dir>          Locales directory (e.g. ./i18n)      [required]
  -f, --fallback <locale>   Fallback/canonical locale            [default: en]
  -o, --out <file>          Output file for generated types      [default: src/i18n.types.d.ts]
      --namespace-by-file   Match the runtime namespaceByFile option
      --fallbacks <json>    Fallback chains, e.g. '{"de-AT":"de"}'
  -h, --help                Show this help
`;

function main(): void {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			path: { type: 'string', short: 'p' },
			fallback: { type: 'string', short: 'f', default: 'en' },
			out: { type: 'string', short: 'o', default: 'src/i18n.types.d.ts' },
			'namespace-by-file': { type: 'boolean', default: false },
			fallbacks: { type: 'string' },
			help: { type: 'boolean', short: 'h', default: false }
		}
	});

	const command = positionals[0];

	if (values.help || !command) {
		console.log(USAGE);
		process.exit(command ? 0 : 1);
	}

	if (!values.path) {
		console.error('Error: --path is required\n');
		console.log(USAGE);
		process.exit(1);
	}

	const locales = normalizeLocaleMessages(
		scanLocales(values.path, {
			namespaceByFile: values['namespace-by-file'],
			onWarn: message => console.warn(`warn: ${message}`)
		}),
		message => console.warn(`warn: ${message}`)
	);

	let fallbacks: Record<string, string> | undefined;
	if (values.fallbacks) {
		try {
			fallbacks = JSON.parse(values.fallbacks);
		} catch {
			console.error(
				'Error: --fallbacks must be a valid JSON object, e.g. \'{"de-AT":"de"}\''
			);
			process.exit(1);
		}
	}
	const fallbackMap = normalizeFallbacks(fallbacks);
	const fallbackLocale = normalizeLocale(values.fallback);

	const fallback = locales.get(fallbackLocale);
	if (!fallback) {
		console.error(
			`Error: fallback locale "${values.fallback}" not found in ${values.path}. Available: ${
				[...locales.keys()].join(', ') || '(none)'
			}`
		);
		process.exit(1);
	}

	switch (command) {
		case 'types':
			cmdTypes(fallback, values.out);
			break;
		case 'validate':
			process.exit(cmdValidate(locales, fallback, fallbackMap, fallbackLocale));
			break;
		default:
			console.error(`Error: unknown command "${command}"\n`);
			console.log(USAGE);
			process.exit(1);
	}
}

function cmdTypes(fallback: Map<string, string>, out: string): void {
	const declaration = generateTypesDeclaration(fallback);
	const target = path.resolve(out);

	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, declaration);

	console.log(
		`Generated types for ${fallback.size} key(s) -> ${target}\n` +
			`The file is picked up automatically by tsc as long as it is inside your tsconfig include paths (default: src/).`
	);
}

function cmdValidate(
	locales: Map<string, Map<string, string>>,
	fallback: Map<string, string>,
	fallbacks: Map<string, string>,
	fallbackLocale: string
): number {
	const errors: string[] = [];
	const warnings: string[] = [];

	for (const [locale, messages] of locales) {
		if (locale === fallbackLocale) continue;

		// Keys covered by intermediate locales in the fallback chain count
		// as translated; only the terminal fallbackLanguage does not.
		const covered = new Set<string>();
		for (const chainLocale of explicitChain(locale, fallbacks, fallbackLocale)) {
			for (const key of locales.get(chainLocale)?.keys() ?? []) {
				covered.add(key);
			}
		}

		const missing = [...fallback.keys()].filter(key => !messages.has(key) && !covered.has(key));
		const extra = [...messages.keys()].filter(key => !fallback.has(key));

		for (const key of missing) {
			errors.push(`${locale}: missing key "${key}"`);
		}
		for (const key of extra) {
			warnings.push(`${locale}: extra key "${key}" not present in ${fallbackLocale}`);
		}

		for (const [key, message] of messages) {
			const ref = fallback.get(key);
			if (ref === undefined) continue;

			const args = extractArgs(message);
			const refArgs = extractArgs(ref);

			if (args === null) {
				errors.push(`${locale}: invalid ICU message at "${key}": ${message}`);
				continue;
			}
			if (refArgs === null) {
				errors.push(`${fallbackLocale}: invalid ICU message at "${key}": ${ref}`);
				continue;
			}

			const argNames = Object.keys(args).sort().join(',');
			const refNames = Object.keys(refArgs).sort().join(',');
			if (argNames !== refNames) {
				errors.push(
					`${locale}: key "${key}" arguments differ from ${fallbackLocale} (${argNames || 'none'} vs ${refNames || 'none'})`
				);
			}
		}
	}

	for (const warning of warnings) console.warn(`warn: ${warning}`);
	for (const error of errors) console.error(`error: ${error}`);

	if (errors.length > 0) {
		console.error(
			`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s)`
		);
		return 1;
	}

	console.log(
		`Validation passed: ${locales.size} locale(s), ${fallback.size} fallback key(s), ${warnings.length} warning(s)`
	);
	return 0;
}

main();
