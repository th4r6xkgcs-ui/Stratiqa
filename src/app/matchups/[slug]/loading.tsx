export default function MatchupLoading() {
  return <div className="page"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-panel" /><div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-card" key={item} />)}</div></div>;
}
