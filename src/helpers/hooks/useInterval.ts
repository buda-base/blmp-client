import { useEffect, useRef } from "react"

// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export default function useInterval(callback: () => any, delay: number) {
  const savedCallback = useRef<null | (() => any)>(null)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current)
        savedCallback.current()
    }
    if (delay !== null) {
      const id = window.setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}
