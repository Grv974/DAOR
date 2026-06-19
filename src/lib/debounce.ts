/**
 * Per-key debounce. Used to coalesce frequent writes (e.g. editor content
 * changes) into a single IndexedDB write per page.
 */
export function createKeyedDebounce<A extends unknown[]>(
  fn: (key: string, ...args: A) => void,
  delay: number,
) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const debounced = (key: string, ...args: A) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn(key, ...args);
      }, delay),
    );
  };
  debounced.flush = (key: string, ...args: A) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.delete(key);
    fn(key, ...args);
  };
  return debounced;
}
