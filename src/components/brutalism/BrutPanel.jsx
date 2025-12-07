export default function BrutPanel({ title, children, className = "" }) {
  return (
    <div
      className={`
        bg-white border-2 border-black rounded-xl p-4
        shadow-[4px_4px_0px_#000]
        ${className}
      `}
    >
      {title && (
        <h2 className="text-xl font-black mb-3 border-b-2 border-black pb-1">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}