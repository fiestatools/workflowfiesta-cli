import deepmergeLib from 'deepmerge'

const arrayMerge: deepmergeLib.Options['arrayMerge'] = (_target, source) => source

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  return deepmergeLib(target, source as T, { arrayMerge }) as T
}

export function deepMergeAll<T extends Record<string, unknown>>(
  ...objects: Array<Partial<T> | undefined>
): T {
  const filtered = objects.filter((obj): obj is Partial<T> => obj !== undefined)

  if (filtered.length === 0) {
    return {} as T
  }

  return deepmergeLib.all(filtered, { arrayMerge }) as T
}

export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}
