import type { ComponentProps } from 'react'
import styles from './Button.module.css'

type Props = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost'
}

export const Button = ({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: Props) => (
  <button type={type} className={`${styles.button} ${styles[variant]} ${className}`} {...props} />
)
