import fs from 'node:fs';
import path from 'node:path';

/** locale -> (dot.key -> raw ICU message) */
export type LocaleMessages = Map<string, Map<string, string>>;

export interface ScanOptions {
	/** Prefix keys with the file namespace derived from the JSON file path. */
	namespaceByFile?: boolean;
	onWarn?: (message: string) => void;
}

/**
 * Recursively scans `localesPath` for JSON files under each locale directory
 * and flattens every JSON object into dot-separated keys. Shared by the
 * runtime loader and the `i18nestjs` CLI.
 */
export function scanLocales(localesPath: string, options: ScanOptions = {}): LocaleMessages {
	const result: LocaleMessages = new Map();
	const resolved = path.resolve(localesPath);

	if (!fs.existsSync(resolved)) {
		options.onWarn?.(`Translations directory not found: ${resolved}`);
		return result;
	}

	for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;

		const localeDir = path.join(resolved, entry.name);
		const messages = new Map<string, string>();

		for (const file of collectJsonFiles(localeDir)) {
			const namespace = options.namespaceByFile
				? toNamespace(path.relative(localeDir, file)).replace(/\.$/, '')
				: '';

			let parsed: unknown;
			try {
				parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
			} catch {
				options.onWarn?.(`Failed to parse JSON, skipping: ${file}`);
				continue;
			}

			flatten(parsed, namespace, messages, file, options.onWarn);
		}

		result.set(entry.name, messages);
	}

	return result;
}

function collectJsonFiles(dir: string): string[] {
	const files: string[] = [];

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectJsonFiles(full));
		} else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
			files.push(full);
		}
	}

	return files;
}

function toNamespace(relativePath: string): string {
	return (
		relativePath
			.replace(/\\/g, '/')
			.replace(/\.json$/i, '')
			.split('/')
			.filter(Boolean)
			.join('.') + '.'
	);
}

function flatten(
	value: unknown,
	prefix: string,
	out: Map<string, string>,
	file: string,
	onWarn?: (message: string) => void
): void {
	if (typeof value === 'string') {
		if (!prefix) {
			onWarn?.(`Skipping non-object root value in ${file}`);
			return;
		}
		if (out.has(prefix)) {
			onWarn?.(`Duplicate translation key "${prefix}" (last one wins)`);
		}
		out.set(prefix, value);
		return;
	}

	if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
		for (const [key, child] of Object.entries(value)) {
			flatten(child, prefix ? `${prefix}.${key}` : key, out, file, onWarn);
		}
		return;
	}

	onWarn?.(`Skipping non-string value at "${prefix || '(root)'}" in ${file}`);
}
