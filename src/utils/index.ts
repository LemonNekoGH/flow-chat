export function setToggle<T>(s: Set<T>, t: T) {
  s.has(t) ? s.delete(t) : s.add(t)
}

export function scrollToBottom(el?: Element | null) {
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}
