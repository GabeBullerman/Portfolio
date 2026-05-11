import { useEffect, useState } from 'react'

export function useTypingEffect(texts: string[]): string {
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    let count = 0
    let index = 0
    let isDeleting = false
    let timeoutId: ReturnType<typeof setTimeout>

    function type() {
      const currentText = texts[count % texts.length]

      if (isDeleting) {
        index--
      } else {
        index++
      }

      setDisplayText(currentText.slice(0, index))

      let speed = 65
      if (isDeleting) speed = 22

      if (!isDeleting && index === currentText.length) {
        timeoutId = setTimeout(() => {
          isDeleting = true
          type()
        }, 1000)
        return
      } else if (isDeleting && index === 0) {
        isDeleting = false
        count++
        timeoutId = setTimeout(type, 500)
        return
      }

      timeoutId = setTimeout(type, speed)
    }

    type()
    return () => clearTimeout(timeoutId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return displayText
}
