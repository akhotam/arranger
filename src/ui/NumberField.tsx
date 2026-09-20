import { useEffect, useState } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  title?: string
}

// local text state lets the user type partial input like "1." or "-" without losing it to a reformat
export function NumberField({ value, onChange, min, step = 1, title }: Props) {
  const [text, setText] = useState(String(round(value)))
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(round(value))))
  }, [value])

  const valid = (n: number) => Number.isFinite(n) && (min === undefined || n >= min)

  return (
    <input
      type="number"
      value={text}
      min={min}
      step={step}
      title={title}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && valid(n)) onChange(n)
      }}
      onBlur={() => { if (!valid(Number(text)) || text === '') setText(String(round(value))) }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
    />
  )
}

const round = (v: number) => Math.round(v * 100) / 100
