# Changelog

## [2.3.1](https://github.com/iamAlond/i18nestjs/compare/2.3.0...2.3.1) (2026-11-26)

### Bug Fixes

* **types:** fix incorrect generation types declaration ([d0aeea1](https://github.com/iamAlond/i18nestjs/commit/d0aeea13cb2ccb7f12b9b49b844d688fd8fcf8cb))

## [2.3.0](https://github.com/iamAlond/i18nestjs/compare/2.2.0...2.3.0) (2026-11-25)

### Features

* **async-resolvers:** add support promise for resolve lang ([a3ed5c9](https://github.com/iamAlond/i18nestjs/commit/a3ed5c9b778ad750bac564606ad4cf52cb9238e7))
* **cli:** add watch options for hmr ([d589b49](https://github.com/iamAlond/i18nestjs/commit/d589b490ef94f89ee4b0622705dae3b638229e40))
* **headers-resolver:** add full support accept-language in headers resolver ([47b7adb](https://github.com/iamAlond/i18nestjs/commit/47b7adbbbfa93a2efe62b76e617a2dd641714199))
* **options:** add in module generation types path option ([6fb427d](https://github.com/iamAlond/i18nestjs/commit/6fb427dc57237586b90fe5653a06a4a0694235ae))
* **strict-select:** add strict types for select arguments ([691f8cd](https://github.com/iamAlond/i18nestjs/commit/691f8cd02489755108292f23ef47ebc0d54163e9))
* **validation:** add validation message i18n function ([880ae89](https://github.com/iamAlond/i18nestjs/commit/880ae89481a0c3ca7e7c9d8be517b717c36c9f6f))

## [2.2.0](https://github.com/iamAlond/i18nestjs/compare/2.1.0...2.2.0) (2026-11-22)

### Features

* add i18n context and locale resolvers ([c0eb251](https://github.com/iamAlond/i18nestjs/commit/c0eb2515e9ea6bcac953bff9b3d965c14f6bb143))

### Documentation

* update readme ([fb24b4a](https://github.com/iamAlond/i18nestjs/commit/fb24b4a6ecd011ee290c439b4dc5f684dc181ba4))

### Testing

* **e2e:** add http e2e tests ([b16ffd9](https://github.com/iamAlond/i18nestjs/commit/b16ffd9e798b6d43f9d4e5149ad60882ed17f37d))

## [2.1.0](https://github.com/iamAlond/i18nestjs/compare/1.3.3...2.1.0) (2026-11-22)

* **deps:** bump the github-actions group with 5 updates ([#37](https://github.com/iamAlond/i18nestjs/issues/37)) ([caeab6f](https://github.com/iamAlond/i18nestjs/commit/caeab6f51d8604b978ce6f06a9848ff3ac2fbfd1))
* **security:** update security ([bf908da](https://github.com/iamAlond/i18nestjs/commit/bf908dafff0018730ea9eebeec5586089cf1d39c))
* trigger publish workflow on any tag ([fc90819](https://github.com/iamAlond/i18nestjs/commit/fc90819d6afafd6c281d4b5797d9c1310e84589b))

### Features

* Add per-locale fallback chains and locale canonicalization ([8ddf091](https://github.com/iamAlond/i18nestjs/commit/8ddf091e90dd16e199e8fdf1c7f9a83897ae78dd))
* Auto-fallback regional locales to base language ([c7971a7](https://github.com/iamAlond/i18nestjs/commit/c7971a7981b9741e493ea8aaf16cfe739b03e2c6))
* Default CLI types output to src/i18n.types.d.ts ([fd58b84](https://github.com/iamAlond/i18nestjs/commit/fd58b84e21f5aa3b0cb67ff03e5b8a0acd2ddcb9))
* Rewrite as i18nestjs v2 with ICU MessageFormat and type-safe keys ([8ef5b7d](https://github.com/iamAlond/i18nestjs/commit/8ef5b7d471d620db98deb0d771560f4a8afbf464))

### Bug Fixes

* Split tsconfig into IDE base and build config ([8ac82e4](https://github.com/iamAlond/i18nestjs/commit/8ac82e4ce6772fb589805b2ef8178b7b235960c8))

### Documentation

* **readme:** update readme & package links ([e8fe258](https://github.com/iamAlond/i18nestjs/commit/e8fe258ca475db28f64fe22dab29a4073710353b))

### Testing

* Add Nest DI integration tests and shared fixtures ([2159a2c](https://github.com/iamAlond/i18nestjs/commit/2159a2caca53e924150c28645b2bedf626264243))

## [1.3.3](https://github.com/iamAlond/nestjs-i18next/compare/1.3.2...1.3.3) (2026-11-21)

* **deps-dev:** bump the dev-deps group across 1 directory with 10 updates ([1befc9c](https://github.com/iamAlond/nestjs-i18next/commit/1befc9cbaffc33d3e89abde12d4b2e8932b923d1))
* **deps-dev:** bump the dev-deps group across 1 directory with 10 updates ([#24](https://github.com/iamAlond/nestjs-i18next/issues/24)) ([354c5c0](https://github.com/iamAlond/nestjs-i18next/commit/354c5c0588ab8345766598fbac76b5e44a22ed4a))
* **deps-dev:** bump the dev-deps group across 1 directory with 4 updates ([#35](https://github.com/iamAlond/nestjs-i18next/issues/35)) ([20cd07d](https://github.com/iamAlond/nestjs-i18next/commit/20cd07d35d41247ce0e7f6f7628bbbdd04911596))
* **deps-dev:** bump the dev-deps group across 1 directory with 6 updates ([#32](https://github.com/iamAlond/nestjs-i18next/issues/32)) ([fb48c22](https://github.com/iamAlond/nestjs-i18next/commit/fb48c2247ce14397ec3d398660334eec2f598ab6))
* **deps-dev:** bump the dev-deps group across 1 directory with 8 updates ([#20](https://github.com/iamAlond/nestjs-i18next/issues/20)) ([21a8b8d](https://github.com/iamAlond/nestjs-i18next/commit/21a8b8d1f3cd99f227f85c253fffdbdc12bfeb3a))
* **deps-dev:** bump the dev-deps group across 1 directory with 9 updates ([#27](https://github.com/iamAlond/nestjs-i18next/issues/27)) ([a343e41](https://github.com/iamAlond/nestjs-i18next/commit/a343e4127d7430d808723305e9614a4316bbef19))
* **deps-dev:** bump the dev-deps group with 3 updates ([#33](https://github.com/iamAlond/nestjs-i18next/issues/33)) ([cb5820f](https://github.com/iamAlond/nestjs-i18next/commit/cb5820f29db6906beb7d136844181209ed6f01bc))
* **deps-dev:** bump the dev-deps group with 4 updates ([#13](https://github.com/iamAlond/nestjs-i18next/issues/13)) ([5ed933d](https://github.com/iamAlond/nestjs-i18next/commit/5ed933d97f6b6dafb702682a632389ad5195a7da))
* **deps-dev:** bump the dev-deps group with 7 updates ([7ae4979](https://github.com/iamAlond/nestjs-i18next/commit/7ae4979c85d6debde5c94655c7b7be67031a1492))
* **deps-dev:** bump the dev-deps group with 9 updates ([#28](https://github.com/iamAlond/nestjs-i18next/issues/28)) ([254849e](https://github.com/iamAlond/nestjs-i18next/commit/254849e13b402bca2821ec9a9f126f8032bb4e78))
* **deps:** bump actions/dependency-review-action from 4 to 5 ([122ee58](https://github.com/iamAlond/nestjs-i18next/commit/122ee58fd8dcb3144401679a890bf92e9e419397))
* **deps:** bump actions/stale from 10.2.0 to 10.3.0 ([e840d51](https://github.com/iamAlond/nestjs-i18next/commit/e840d51eaf86e576e53fab0fb30bcce41fda6ea8))
* **deps:** bump dependabot/fetch-metadata from 3.0.0 to 3.1.0 ([2f2c31a](https://github.com/iamAlond/nestjs-i18next/commit/2f2c31adb34784375d1f23119fb9d59f97df815b))
* setup dependabot, github actions, pnpm env, husky, npm publish ([988eaad](https://github.com/iamAlond/nestjs-i18next/commit/988eaad9af160f4996ada2c2d9cfe483e08e7491))

### Bug Fixes

* **release:** disable npm publish in release-it config ([c0ba2d4](https://github.com/iamAlond/nestjs-i18next/commit/c0ba2d412c5493b5fe1b146d21128180ebd2972a))

## [1.3.2](https://github.com/iamAlond/nestjs-i18next/compare/1.3.1...1.3.2) (2026-04-04)

### Bug Fixes

* **loader:** skip generation type, start watcher if env production ([b0010dd](https://github.com/iamAlond/nestjs-i18next/commit/b0010ddc88b1bbd3d990b4e32fcb3eb7ee94accf))

## [1.3.1](https://github.com/iamAlond/nestjs-i18next/compare/1.3.0...1.3.1) (2026-04-04)

### Bug Fixes

* **loader:** delete unused type in generated types file ([adf82e9](https://github.com/iamAlond/nestjs-i18next/commit/adf82e9deb3d78f4013460d0943904e4a9d03017))
* **translate:** optionality of options is now auto determined from key ([ae8d85e](https://github.com/iamAlond/nestjs-i18next/commit/ae8d85e4fb5621af183cf976cddfb17f2d2daff1))

### Documentation

* **readme:** updated usage and examples ([4177861](https://github.com/iamAlond/nestjs-i18next/commit/417786163e7d08f799c46adabe89eba0c18551e0))

## 1.3.0 (2026-04-04)

### Features

* create base text translation ([a176d42](https://github.com/iamAlond/nestjs-i18next/commit/a176d420776c7f88d9386ca77f8a68f9d10a5064))
* **translate:** update t function, minor changes in json loader logs ([e597a04](https://github.com/iamAlond/nestjs-i18next/commit/e597a044b343b606a45f68f3326be460e571d071))

### Documentation

* update pkg name and readme.md ([1c85706](https://github.com/iamAlond/nestjs-i18next/commit/1c857060bfe9c6737c55e401918a92d1cf3fe483))
