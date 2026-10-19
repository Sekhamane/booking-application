export default function Button({ variant = 'gold', children, style, ...props }) {
  return (
    <button className={variant === 'ghost' ? 'btn-ghost' : 'btn-gold'} style={style} {...props}>
      {children}
    </button>
  )
}
