import { ConfigurableModuleBuilder } from '@nestjs/common';
import { I18nModuleOptions } from './options';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<I18nModuleOptions>()
		.setClassMethodName('forRoot')
		.setFactoryMethodName('createI18nOptions')
		.setExtras({ isGlobal: true }, (definition, extras) => ({
			...definition,
			global: extras.isGlobal
		}))
		.build();
