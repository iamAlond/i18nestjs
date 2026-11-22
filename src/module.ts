import { APP_INTERCEPTOR } from '@nestjs/core';
import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { I18nInterceptor } from './interceptor';
import { JsonLoader } from './loader';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module-definition';
import { I18nModuleOptions } from './options';
import { I18nService } from './service';

@Module({
	providers: [I18nService, JsonLoader, { provide: APP_INTERCEPTOR, useClass: I18nInterceptor }],
	exports: [I18nService]
})
export class I18nModule extends ConfigurableModuleClass implements OnModuleInit {
	private readonly logger = new Logger(I18nModule.name);

	@Inject(MODULE_OPTIONS_TOKEN)
	private readonly options: I18nModuleOptions;

	onModuleInit(): void {
		if (this.options.logging) {
			this.logger.log(`I18nModule initialized: ${JSON.stringify(this.options)}`);
		}
	}
}
