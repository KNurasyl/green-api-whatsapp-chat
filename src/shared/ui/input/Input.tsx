import { useId, type ComponentProps } from 'react'
import styles from './Input.module.css'

type Props = ComponentProps<'input'> & {
  label: string
  hint?: string
}

export const Input = ({ label, hint, id: suppliedId, ...props }: Props) => {
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
