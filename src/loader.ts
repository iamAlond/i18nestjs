import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { I18nModuleOptions } from './options';
import { LocaleMessages, scanLocales } from './scan';
import { MODULE_OPTIONS_TOKEN } from './module-definition';

@Injectable()
export class JsonLoader implements OnModuleDestroy {
	private readonly logger = new Logger(JsonLoader.name);

	private watcher: fs.FSWatcher | null = null;
	private watchTimeout: NodeJS.Timeout | null = null;

	constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: I18nModuleOptions) {}

	load(): LocaleMessages {
		return scanLocales(this.options.localesPath, {
			namespaceByFile: this.options.namespaceByFile,
			onWarn: message => this.logger.warn(message)
		});
	}

	watch(onChange: () => void): void {
		const enabled = this.options.watch ?? process.env.NODE_ENV !== 'production';
		if (!enabled) return;

		const targetPath = path.resolve(this.options.localesPath);

		try {
			this.watcher = fs.watch(targetPath, { recursive: true }, (_event, filename) => {
				if (!filename || !filename.endsWith('.json')) return;

				if (this.watchTimeout) clearTimeout(this.watchTimeout);
				this.watchTimeout = setTimeout(() => {
					this.watchTimeout = null;
					if (this.options.logging) {
						this.logger.log('Translation file changed, reloading...');
					}
					onChange();
				}, 100);
			});
		} catch (error) {
			this.logger.error(`Could not start watcher: ${(error as Error).message}`);
		}
	}

	onModuleDestroy(): void {
		this.watcher?.close();
		if (this.watchTimeout) clearTimeout(this.watchTimeout);
	}
}
