<div align="center">
   <h1>🌍 i18nestjs</h1>
   <p>Type-safe ICU internationalization for <a href="https://nestjs.com">NestJS</a></p>
</div>

<p align="center">
    <a href='https://img.shields.io/npm/v/i18nestjs'><img src="https://img.shields.io/npm/v/i18nestjs" alt="NPM Version" /></a>
    <a href='https://img.shields.io/npm/l/i18nestjs'><img src="https://img.shields.io/npm/l/i18nestjs" alt="NPM License" /></a>
    <a href='https://img.shields.io/npm/dm/i18nestjs'><img src="https://img.shields.io/npm/dm/i18nestjs" alt="NPM Downloads" /></a>
    <a href='https://img.shields.io/github/last-commit/iamAlond/i18nestjs'><img src="https://img.shields.io/github/last-commit/iamAlond/i18nestjs" alt="NPM Downloads" /></a>
</p>

**i18nestjs** is a type-safe internationalization module for NestJS.

- **Real ICU MessageFormat** via [`intl-messageformat`](https://formatjs.io/docs/intl-messageformat/) — plurals, selects, number/date/time skeletons, correct CLDR plural rules for every locale
- **Compile-time type safety** — keys _and_ per-key argument types, generated from your JSON files by a CLI (no runtime codegen, works in Docker builds)
- **Locale fallback chains** — `de-AT → de → en`, plus automatic base-language fallback (`pt-BR → pt`)
- **Strict mode & validation** — enforce key parity across locales
- **Live reload** — translation files watched in development

---

## Installation

**Node.js 22.0.0 or newer is required.**

```bash
npm install i18nestjs
# or: pnpm add i18nestjs / yarn add i18nestjs
```

## Quick start

### 1. Translation files

```
src/i18n/
├── en/
│   ├── common.json
│   └── errors.json
└── ru/
    ├── common.json
    └── errors.json
```

`src/i18n/en/common.json`:

```json
{
    "hello": "Hello {name}!",
    "items": "{count, plural, one {# item} other {# items}}",
    "profile": {
        "title": "Profile of {name}"
    }
}
```

JSON objects are flattened into dot-keys: `profile.title` above. Flat `"a.b": "..."` keys work too.

### 2. Register the module

```typescript
import { Module } from '@nestjs/common';
import { I18nModule } from 'i18nestjs';

@Module({
    imports: [
        I18nModule.forRoot({
            fallbackLanguage: 'en',
            localesPath: './src/i18n',
            fallbacks: { 'de-AT': 'de' },
            logging: true
        })
    ]
})
export class AppModule {}
```

### 3. Generate types

```bash
npx i18nestjs types -p ./src/i18n -f en
# → src/i18n.types.d.ts (default output)
```

The generated `.d.ts` is picked up by `tsc` automatically — no import needed. Regenerate whenever fallback-language files change (CI, Docker build, or a `prebuild` script).

### 4. Use it

```typescript
import { Injectable } from '@nestjs/common';
import { I18nService } from 'i18nestjs';

@Injectable()
export class AppService {
    constructor(private readonly i18n: I18nService) {}

    greet() {
        this.i18n.t('hello', { name: 'World' }); // "Hello World!"
        this.i18n.t('items', { count: 5 }); // "5 items"
        this.i18n.t('profile.title', { name: 'Ada' }); // nested key
        this.i18n.t('hello', { name: 'Мир', locale: 'ru' }); // per-call locale
    }
}
```

TypeScript now enforces:

```typescript
this.i18n.t('helo', { name: 'x' }); // ❌ unknown key
this.i18n.t('hello'); // ❌ missing required arg `name`
this.i18n.t('items', { count: 'five' }); // ❌ count must be number
this.i18n.t('hello', { name: 'x', bogus: 1 }); // ❌ unknown argument
```

Escape hatch for dynamic keys: `this.i18n.t(key as I18nKey, ...)`.

## ICU syntax

Standard [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/):

```json
{
    "welcome": "Hello {name}!",
    "items": "{count, plural, one {# item} other {# items}}",
    "invited": "{gender, select, male {He} female {She} other {They}} invited you",
    "due": "Due {date, date, short}",
    "price": "{price, number, ::currency/USD}",
    "literal": "Use '{name}' to insert literally"
}
```

- `{name}` → `string | number`
- `{count, plural, ...}` / `{n, selectordinal, ...}` → `number`
- `{x, select, ...}` → union of branch selectors, e.g. `"male" | "female" | "other"`
- `{d, date}` / `{t, time}` → `Date | number`
- `{n, number}` → `number`
- Escape literal braces with an apostrophe: `'{name}'`

## Locale resolution

Lookup order for `t(key, { locale })`:

```
requested → explicit fallbacks → base language (xx-YY → xx) → fallbackLanguage
```

```typescript
I18nModule.forRoot({
    fallbackLanguage: 'en',
    fallbacks: { 'de-AT': 'de', 'zh-CN': 'zh' },
    fallbackToBaseLanguage: true // default — pt-BR automatically tries pt/
});
```

Locale tags are canonicalized: `de-at`, `de_AT`, `DE-at` all match `de-AT`. The plural/date formatting uses the locale of the message actually found.

## Request locale context

Locale precedence in `t()`:

```
options.locale → I18nContext → defaultLocale → fallbackLanguage
```

`I18nContext` (AsyncLocalStorage) binds a locale to the current async execution — set it once, and every `t()` call inside picks it up automatically:

```typescript
I18nContext.run('ru', () => {
    i18n.t('hello', { name: 'Мир' }); // Russian, no locale option needed
});

I18nContext.enterWith('ru'); // for the rest of the current async context
I18nContext.locale(); // 'ru' | undefined
```

This is the integration point for non-HTTP frameworks — bots, queues, cron jobs:

```typescript
bot.on('interactionCreate', interaction =>
    I18nContext.run(interaction.locale, async () => {
        await interaction.reply(i18n.t('welcome', { name: interaction.user.username }));
    })
);
```

For iterating over users with different locales (notifications, fan-out), use the scoped service instead — no context needed:

```typescript
for (const user of subscribers) {
    const text = i18n.withLocale(user.locale).t('notifications.newPost', { title: post.title });
    await send(user.id, text);
}
```

## Locale resolvers

For HTTP (and any framework running on Nest's `ExecutionContext`), configure `resolvers` — a chain evaluated per request. The first resolver returning a non-empty locale wins and is bound to `I18nContext` automatically:

```typescript
import { CookieResolver, HeaderResolver, I18nModule } from 'i18nestjs';

I18nModule.forRoot({
    fallbackLanguage: 'en',
    localesPath: './src/i18n',
    resolvers: [
        new CookieResolver('lang'), // explicit user choice first
        new HeaderResolver(['x-selected-language', 'accept-language']) // then browser default
    ]
});
```

Built-in resolvers:

| Resolver         | Source                                            |
| ---------------- | ------------------------------------------------- |
| `HeaderResolver` | `string \| string[]` of header names, first match |
| `QueryResolver`  | `?lang=ru`                                        |
| `ParamResolver`  | route param, e.g. `/users/:locale`                |
| `CookieResolver` | cookie                                            |

Resolvers run **after guards**, so `req.user` is already populated — useful for DB-backed locales. `Accept-Language` is fully parsed: entries are ordered by `q` weight and the first tag matching a **loaded** locale wins — `fr-CH,fr;q=0.9,en;q=0.8` resolves to `en` when French isn't available.

`resolve()` may be **async** — the handler waits for the chain to settle, so you can load the locale from Redis or a database:

```typescript
@Injectable()
export class UserLocaleResolver implements I18nResolver {
    constructor(private readonly users: UsersService) {}

    async resolve(context: ExecutionContext): Promise<string | undefined> {
        if (context.getType() !== 'http') return undefined;
        const request = context.switchToHttp().getRequest();
        const user = await this.users.findById(request.user?.id);
        return user?.locale;
    }
}
```

### Custom resolvers

Implement `I18nResolver` for any framework. The context is the standard Nest `ExecutionContext` — unwrap it with the framework's helper:

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { I18nResolver } from 'i18nestjs';
import { NecordExecutionContext } from 'necord';

@Injectable()
export class NecordLocaleResolver implements I18nResolver {
    resolve(context: ExecutionContext): string | undefined {
        const [interaction] = NecordExecutionContext.create(context).getContext();
        return interaction?.locale;
    }
}

// then:
resolvers: [new NecordLocaleResolver(), new HeaderResolver('accept-language')];
```

A resolver throwing an error is logged and skipped — the chain continues.

## Module options

| Option                   | Type                      | Default                     | Description                                                                                |
| ------------------------ | ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `fallbackLanguage`       | `string`                  | **required**                | Canonical locale: last-resort fallback, reference for types                                |
| `localesPath`            | `string`                  | **required**                | Directory with one subfolder per locale                                                    |
| `fallbacks`              | `Record<string, string>`  | `{}`                        | Explicit chains: `{ 'de-AT': 'de' }`                                                       |
| `fallbackToBaseLanguage` | `boolean`                 | `true`                      | `xx-YY` → `xx` automatic fallback                                                          |
| `defaultLocale`          | `string`                  | `fallbackLanguage`          | Locale when `t()` gets none                                                                |
| `strict`                 | `boolean`                 | `false`                     | Fail init unless every key is covered per locale (via chains, excluding terminal fallback) |
| `namespaceByFile`        | `boolean`                 | `false`                     | Prefix keys with file path: `user.json` → `user.profile.name`                              |
| `watch`                  | `boolean`                 | `NODE_ENV !== 'production'` | Reload on file changes                                                                     |
| `missingKey`             | `'return-key' \| 'throw'` | `'return-key'`              | Missing key behavior                                                                       |
| `resolvers`              | `I18nResolver[]`          | `[]`                        | Per-request locale resolvers (see [Locale resolvers](#locale-resolvers))                   |
| `logging`                | `boolean`                 | `false`                     | Informational logs                                                                         |

`forRootAsync({ useFactory })` is supported; pass `{ isGlobal: true }` to make the module global.

> **Note on `watch`:** it defaults to `NODE_ENV !== 'production'`. If `NODE_ENV` is unset (e.g. a bare `node dist/main` without env config), watch stays **enabled** — pass `watch: false` explicitly or set `NODE_ENV=production` in deployment environments.

## Service API

```typescript
i18n.t(key, options?)           // translate; options = ICU args + reserved opts
i18n.getLocales()               // loaded locale codes
i18n.getMessage(locale, key)    // raw ICU message or undefined
i18n.has(key, locale?)          // key presence in fallback chain
i18n.withLocale('ru')           // scoped service bound to a locale
i18n.locale()                   // effective locale of the current context
i18n.reload()                   // manual reload from disk
```

Reserved options (stripped before ICU formatting — don't use them as argument names): `locale`, `defaultValue`, `debug`.

## CLI

```bash
i18nestjs types -p ./src/i18n -f en -o src/i18n.types.d.ts
i18nestjs types -p ./src/i18n -f en --watch   # regenerate on file changes
i18nestjs validate -p ./src/i18n -f en --fallbacks '{"de-AT":"de"}'
```

- **`types`** — generates the `I18nTypes` module augmentation from the fallback locale (keys + per-key arg types parsed from ICU AST)
- **`validate`** — checks every locale against the fallback: missing/extra keys (via fallback chains), invalid ICU syntax, mismatched arguments. Exit code 1 on errors — usable in CI

## Docker / CI

Types are generated statically — no dev server needed:

```dockerfile
RUN pnpm i18nestjs types -p ./src/i18n -f en && pnpm build
```

Or commit `i18n.types.d.ts` to git and regenerate in CI when translations change.

## Compatibility

- NestJS `^8 || ^9 || ^10 || ^11 || ^12`
- The package is CommonJS — works in both CJS and ESM NestJS applications (Node ≥22.12 for `require(esm)` consumers on the ESM side)

## License

MIT © Matvey iamAlond
