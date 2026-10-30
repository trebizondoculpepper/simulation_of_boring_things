import { configDefaults, defineConfig } from 'vite-plus';
import { execFileSync } from 'node:child_process';
import { version } from './package.json';
import {
  commitsSinceVersionChange,
  derivedVersion,
  gitIn,
} from './scripts/versioning.ts';

/** Build identity for both local and CI builds, beside the package version. */
const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, {
      cwd: import.meta.dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};
const commit = git('rev-parse', '--short', 'HEAD');
const dirty = git('status', '--porcelain') ? ' (uncommitted changes)' : '';
/**
 * The version a build passes in (`scripts/build.ts`), or, on the dev server
 * and in tests, the same derived here: `package.json`'s with its patch
 * moved on by the commits since it last changed, so a local run reports
 * the release it is (Sentry's `release`), not the last one tagged.
 */
const localVersion = derivedVersion(
  version,
  commitsSinceVersionChange(gitIn(import.meta.dirname)) ?? 0,
);
const localBuild = commit
  ? `${commit}${dirty} · ${new Date().toISOString().slice(0, 10)}`
  : `local · ${new Date().toISOString().slice(0, 10)}`;

/**
 * Slow tests (over about 1.5 s, or simulating long stretches of world time)
 * live in `*.slow.test.ts` files. They run locally with `npm test`, and are
 * skipped on CI (GitHub Actions sets `CI=true`) and by `npm run test:fast`.
 */
const truthy = (v: string | undefined) => !!v && v !== '0' && v !== 'false';
const fastOnly = truthy(process.env.CI) || truthy(process.env.FAST_TESTS_ONLY);

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      ...(fastOnly ? ['**/*.slow.test.ts'] : []),
    ],
  },
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(
      process.env.VITE_VERSION || localVersion,
    ),
    'import.meta.env.VITE_BUILD': JSON.stringify(
      process.env.VITE_BUILD || localBuild,
    ),
  },
  lint: {
    plugins: ['oxc', 'typescript', 'unicorn'],
    categories: {
      correctness: 'warn',
    },
    env: {
      builtin: true,
    },
    ignorePatterns: ['dist/**', 'node_modules/**', '.*/**', 'coverage/**'],
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-empty-static-block': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unassigned-vars': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': 'error',
      'no-useless-assignment': 'error',
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'preserve-caught-error': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-array-constructor': 'error',
      'no-unused-expressions': 'error',
      'typescript/ban-ts-comment': 'error',
      'typescript/no-duplicate-enum-values': 'error',
      'typescript/no-empty-object-type': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-extra-non-null-assertion': 'error',
      'typescript/no-misused-new': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-non-null-asserted-optional-chain': 'error',
      'typescript/no-require-imports': 'error',
      'typescript/no-this-alias': 'error',
      'typescript/no-unnecessary-type-constraint': 'error',
      'typescript/no-unsafe-declaration-merging': 'error',
      'typescript/no-unsafe-function-type': 'error',
      'typescript/no-wrapper-object-types': 'error',
      'typescript/prefer-as-const': 'error',
      'typescript/prefer-namespace-keyword': 'error',
      'typescript/triple-slash-reference': 'error',
      'vite-plus/prefer-vite-plus-imports': 'error',
      // Components and views are closures over plain objects, never using
      // `this`, so passing their methods as callbacks (part.step) is safe.
      'typescript/unbound-method': 'off',
    },
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        rules: {
          'constructor-super': 'off',
          'getter-return': 'off',
          'no-class-assign': 'off',
          'no-const-assign': 'off',
          'no-dupe-class-members': 'off',
          'no-dupe-keys': 'off',
          'no-func-assign': 'off',
          'no-import-assign': 'off',
          'no-new-native-nonconstructor': 'off',
          'no-obj-calls': 'off',
          'no-redeclare': 'off',
          'no-setter-return': 'off',
          'no-this-before-super': 'off',
          'no-undef': 'off',
          'no-unreachable': 'off',
          'no-unsafe-negation': 'off',
          'no-var': 'error',
          'no-with': 'off',
          'prefer-const': 'error',
          'prefer-rest-params': 'error',
          'prefer-spread': 'error',
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  fmt: {
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.claude/',
      '.idea/',
      'AGENTS.md',
      'CLAUDE.md',
      'package-lock.json',
      'public/',
    ],
  },
  base: './',
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
});
