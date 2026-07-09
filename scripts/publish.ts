#!/usr/bin/env bun

import { fileURLToPath } from 'node:url'
import { $ } from 'bun'
import pkg from '../package.json'

const dir = fileURLToPath(new URL('..', import.meta.url))
process.chdir(dir)

const channel = process.argv.includes('--latest') ? 'latest' : 'beta'

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  if (process.platform !== 'win32')
    await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version))
    return console.log(`already published ${name}@${version}`)
  await $`bun pm pack`.cwd(dir)
  await $`npm publish *.tgz --access public --tag ${channel}`.cwd(dir)
  console.log(`published ${name}@${version}`)
}

// Gather all platform binaries from dist
const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob('*/package.json').scanSync({ cwd: './dist' })) {
  const item = await Bun.file(`./dist/${filepath}`).json()
  binaries[item.name] = item.version
}

if (Object.keys(binaries).length === 0) {
  console.error('No binaries found in dist/. Run `bun run build` first.')
  process.exit(1)
}

console.log('binaries', binaries)
const version = Object.values(binaries)[0]!

// Create main wrapper package
const mainPkgDir = `./dist/${pkg.name.replace('@workflowfiesta/', '')}`
await $`mkdir -p ${mainPkgDir}/bin`
await $`cp ./bin/wf.cjs ${mainPkgDir}/bin/wf.cjs`
await $`cp ./LICENSE ${mainPkgDir}/LICENSE`

await Bun.file(`${mainPkgDir}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      version,
      description: pkg.description,
      license: pkg.license,
      bin: {
        wf: './bin/wf.cjs',
        workflowfiesta: './bin/wf.cjs',
      },
      files: ['bin', 'LICENSE'],
      os: ['darwin', 'linux', 'win32'],
      cpu: ['arm64', 'x64'],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

// Publish all platform binaries first
await Promise.all(
  Object.entries(binaries).map(([name, version]) =>
    publish(`./dist/${name.replace('@workflowfiesta/', '')}`, name, version),
  ),
)

// Publish main wrapper package last
await publish(mainPkgDir, pkg.name, version)

console.log(`\n✓ Published ${pkg.name}@${version} (${channel})`)
