#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import { rm } from "fs/promises"
import path from "path"
import pkg from "../package.json"

const dir = path.resolve(import.meta.dirname, "..")
const binary = "wf"
const version = pkg.version
process.chdir(dir)

await rm("dist", { recursive: true, force: true })

const singleFlag = process.argv.includes("--single")
const baselineFlag = process.argv.includes("--baseline")
const skipInstall = process.argv.includes("--skip-install")
const sourcemapsFlag = process.argv.includes("--sourcemaps")

const allTargets: {
  os: string
  arch: "arm64" | "x64"
  avx2?: false
}[] = [
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
  { os: "linux", arch: "x64", avx2: false },
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "darwin", arch: "x64", avx2: false },
  { os: "win32", arch: "arm64" },
  { os: "win32", arch: "x64" },
  { os: "win32", arch: "x64", avx2: false },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) return false
      if (item.avx2 === false) return baselineFlag
      return true
    })
  : allTargets

if (!skipInstall) {
  // Install all platform-specific @opentui/core variants for cross-compilation
  const opentuiVersion = pkg.dependencies["@opentui/core"]
  await $`bun install --os="*" --cpu="*" @opentui/core@${opentuiVersion}`
}

const localParserWorker = path.resolve(dir, "node_modules/@opentui/core/parser.worker.js")
const rootParserWorker = path.resolve(dir, "../node_modules/@opentui/core/parser.worker.js")
const parserWorker = fs.existsSync(localParserWorker)
  ? fs.realpathSync(localParserWorker)
  : fs.existsSync(rootParserWorker)
    ? fs.realpathSync(rootParserWorker)
    : null

for (const item of targets) {
  const target = [
    binary,
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
  ]
    .filter(Boolean)
    .join("-")
  const name = target.replace(binary, "cli")
  const binaryExt = item.os === "win32" ? ".exe" : ""
  console.log(`building ${name}`)

  const entrypoints = ["./src/index.tsx"]
  if (parserWorker) {
    entrypoints.push(parserWorker)
  }

  const result = await Bun.build({
    entrypoints,
    tsconfig: "./tsconfig.json",
    external: ["node-gyp"],
    format: "esm",
    minify: true,
    sourcemap: sourcemapsFlag ? "linked" : "none",
    splitting: true,
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: target.replace(binary, "bun") as Bun.Build.CompileTarget,
      outfile: `./dist/${name}/bin/${binary}${binaryExt}`,
      execArgv: [`--user-agent=${binary}/${version}`, "--use-system-ca", "--"],
      windows: {},
    },
    define: {
      WF_VERSION: `'${version}'`,
      WF_CLI_NAME: `'${binary}'`,
      ...(parserWorker
        ? {
            OTUI_TREE_SITTER_WORKER_PATH:
              (item.os === "win32" ? '"B:/~BUN/root/' : '"/$bunfs/root/') +
              path.relative(dir, parserWorker).replaceAll("\\", "/") +
              '"',
          }
        : {}),
    },
  })

  if (!result.success) {
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }

  // Copy LICENSE file to dist
  await Bun.write(
    `./dist/${name}/LICENSE`,
    await Bun.file("./LICENSE").text(),
  )

  const binaryFile = `${binary}${binaryExt}`
  
  await Bun.write(
    `./dist/${name}/package.json`,
    JSON.stringify(
      {
        name: `@workflowfiesta/${name}`,
        version,
        description: pkg.description,
        license: "SEE LICENSE IN LICENSE",
        bin: {
          [binary]: `./bin/${binaryFile}`,
          workflowfiesta: `./bin/${binaryFile}`,
        },
        files: ["bin", "LICENSE"],
        os: [item.os],
        cpu: [item.arch],
      },
      null,
      2,
    ),
  )
}

console.log(`\n✓ Built ${targets.length} target(s)`)
