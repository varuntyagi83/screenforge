import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('smoke test', () => {
  it('cn utility merges classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('cn handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra')
  })
})
