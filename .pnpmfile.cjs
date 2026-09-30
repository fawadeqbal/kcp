// pnpm install hooks.
//
// @prisma/client lists the Prisma CLI and TypeScript as *optional* peer dependencies.
// pnpm links them anyway because they exist in the workspace, which drags the whole
// CLI (Studio, React, dev server…) into the production API image. The runtime never
// needs them, so the optional peers are dropped here.
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === '@prisma/client') {
        for (const peer of ['prisma', 'typescript']) {
          delete pkg.peerDependencies?.[peer];
          delete pkg.peerDependenciesMeta?.[peer];
        }
      }
      return pkg;
    },
  },
};
