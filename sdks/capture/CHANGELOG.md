# @crikket-io/capture

## 0.1.2

### Patch Changes

- a81b881: Fix uninstallable package: move bundled `@crikket/*` workspace packages from
  `dependencies` to `devDependencies`. They are inlined into the dist bundle at
  build time (`--packages=bundle`, only react/react-dom external), so declaring
  them as runtime deps leaked unresolved `workspace:*` specifiers into the
  published tarball and broke `npm/pnpm/yarn install` in external projects.

## 0.1.1

### Patch Changes

- Update dashboard ui style to mono & isolate capture sdk style
