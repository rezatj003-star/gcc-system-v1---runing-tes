export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span>Loading...</span>
    </div>
  );
}