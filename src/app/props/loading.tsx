export default function PropsLoading() {
  return <div className="product-page"><div className="skeleton skeleton-title" /><div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-card" key={item} />)}</div></div>;
}
