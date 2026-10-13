import type { JSX } from 'react'
import { type ComponentProps, useId } from 'react'

import styles from './Input.module.css'

type InputProps = ComponentProps<'input'> & {
  label: string
  hint?: string
}

export const Input = ({ label, hint, id: suppliedId, ...props }: InputProps): JSX.Element => {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const hintId = `${id}-hint`

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        id={id}
        className={styles.input}
        aria-describedby={hint ? hintId : undefined}
      />
      {hint && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  )
}
