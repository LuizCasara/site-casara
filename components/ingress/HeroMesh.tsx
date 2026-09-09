/**
 * A malha de células do hero, desenhando-se uma vez no load (o scanner
 * ligando) por animação CSS escalonada — sem JS, sem client component.
 * `prefers-reduced-motion` já é neutralizado em `app/ingress/theme.css`.
 * Decorativo: `aria-hidden`.
 */
export default function HeroMesh({polygons}: {polygons: [number, number][][]}) {
  return (
    <svg
      className="ing-hero__mesh"
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {polygons.map((poly, i) => (
        <polygon
          key={i}
          points={poly.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(' ')}
          style={{animationDelay: `${(0.15 + i * 0.03).toFixed(2)}s`}}
        />
      ))}
    </svg>
  )
}
