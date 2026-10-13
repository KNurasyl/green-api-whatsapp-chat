import type { ComponentProps, JSX } from 'react'

import styles from './Button.module.css'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost'
}

export const Button = ({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps): JSX.Element => (
  <button type={type} className={`${styles.button} ${styles[variant]} ${className}`} {...props} />
)
