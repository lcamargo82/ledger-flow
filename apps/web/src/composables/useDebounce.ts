import { customRef } from 'vue'

export function useDebouncedRef<T>(value: T, delay = 400) {
  let timeout: ReturnType<typeof setTimeout>
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue: T) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

// Alternativa mais simples para funcoes
export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay = 400
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}
