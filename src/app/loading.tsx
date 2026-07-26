export default function Loading() {
  return <div className="page-loading" role="status" aria-label="Loading STRATIQA">
    <div className="page-loading-brand">STRATI<span>Q</span>A</div>
    <div className="page-loading-bar"><i /></div>
    <p>Syncing models and markets…</p>
  </div>;
}
