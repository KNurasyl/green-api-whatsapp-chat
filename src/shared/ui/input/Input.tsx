import { useId, type ComponentProps } from 'react'
import styles from './Input.module.css'

type Props = ComponentProps<'input'> & {
  label: string
  hint?: string
}

export const Input = ({ label, hint, ...props }: Props) => {
  const id = useId()

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input {...props} className={styles.input} aria-describedby={hint ? id : undefined} />
      {hint && (
        <span className={styles.hint} id={id}>
          {hint}
        </span>
      )}
    </label>
  )
}
