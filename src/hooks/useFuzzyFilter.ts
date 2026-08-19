import { useMemo, useState } from 'react'

export interface FilterableItem {
  key: string
  label: string
  description?: string
}

function substringMatch(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

function fuzzyMatch(query: string, text: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi])
      qi++
  }
  return qi === q.length
}

function matchItem(query: string, item: FilterableItem): 'substring' | 'fuzzy' | false {
  if (substringMatch(query, item.label) || (item.description && substringMatch(query, item.description))) {
    return 'substring'
  }
  if (fuzzyMatch(query, item.label) || (item.description && fuzzyMatch(query, item.description))) {
    return 'fuzzy'
  }
  return false
}

export interface UseFuzzyFilterResult<T extends FilterableItem> {
  query: string
  setQuery: (q: string | ((prev: string) => string)) => void
  filtered: T[]
}

export function useFuzzyFilter<T extends FilterableItem>(items: T[]): UseFuzzyFilterResult<T> {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query)
      return items
    const substring: T[] = []
    const fuzzy: T[] = []
    for (const item of items) {
      const result = matchItem(query, item)
      if (result === 'substring')
        substring.push(item)
      else if (result === 'fuzzy')
        fuzzy.push(item)
    }
    return substring.length > 0 ? [...substring, ...fuzzy] : fuzzy
  }, [items, query])

  return { query, setQuery, filtered }
}
