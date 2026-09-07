import CountUp from './CountUp'

/** Uma métrica: número (pt-BR, com count-up) + rótulo. Server component. */
export default function StatValue({label, value}: {label: string; value: number}) {
  return (
    <div className="ing-stat">
      <div className="ing-stat__value">
        <CountUp value={value} />
      </div>
      <div className="ing-stat__label">{label}</div>
    </div>
  )
}
