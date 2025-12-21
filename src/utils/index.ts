import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function setToggle<T>(s: Set<T>, t: T) {
  if (s.has(t)) {
    s.delete(t)
  }
  else {
    s.add(t)
  }
}

export function scrollToBottom(el?: Element | null) {
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}
