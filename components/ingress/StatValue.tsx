const FMT = new Intl.NumberFormat('pt-BR')

/** Uma métrica: número (pt-BR) + rótulo. Server component. */
export default function StatValue({label, value}: {label: string; value: number}) {
  return (
    <div className="ing-stat">
      <div className="ing-stat__value">{FMT.format(value)}</div>
      <div className="ing-stat__label">{label}</div>
    </div>
  )
}
