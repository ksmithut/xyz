import cx from 'clsx'

/**
 * @param {React.PropsWithChildren<{machine: import('../fly.js').Machine, className?: string}>} props
 */
export function MachineChecks({ machine, className, children }) {
  const statusGrouping = Map.groupBy(
    machine.checks ?? [],
    (item) => item.status
  )
  const hasCritical = statusGrouping.has('critical')
  const hasWarning = statusGrouping.has('warning')
  const hasPassing = statusGrouping.has('passing')

  return (
    <span
      className={cx(
        'inline-flex items-center gap-x-1 rounded-full px-2 py-1 font-mono text-xs font-bold  ring-1 ring-inset',
        hasCritical
          ? 'bg-red-100 text-red-900 ring-red-200'
          : hasWarning
            ? 'bg-yellow-100 text-yellow-900 ring-yellow-200'
            : hasPassing
              ? 'bg-green-100 text-green-900 ring-green-200'
              : 'text-gray-900 ring-gray-200',
        className
      )}
    >
      {children}
      {machine.checks?.map((check) => (
        <svg
          key={check.name}
          className={cx('h-2 w-2', {
            'fill-red-500': check.status === 'critical',
            'fill-yellow-500': check.status === 'warning',
            'fill-green-500': check.status === 'passing'
          })}
          viewBox="0 0 6 6"
          aria-hidden="true"
        >
          <circle cx={3} cy={3} r={3} />
        </svg>
      ))}
    </span>
  )
}
