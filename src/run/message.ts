export async function readStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined
  }

  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => {
      resolve(data.trim() || undefined)
    })
    process.stdin.on('error', () => {
      resolve(undefined)
    })
    // Handle case where stdin has no data
    setTimeout(() => {
      if (!data) {
        process.stdin.destroy()
        resolve(undefined)
      }
    }, 100)
  })
}

export function resolveInput(cliMessage?: string, piped?: string): string | undefined {
  const cli = cliMessage?.trim()
  const pipe = piped?.trim()

  if (!cli && !pipe) {
    return undefined
  }
  if (!cli) {
    return pipe
  }
  if (!pipe) {
    return cli
  }
  return `${cli}\n${pipe}`
}
