export default function BrutInput({
  label,
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="font-bold text-sm">{label}</label>}
      <input
        {...props}
        className={`
          bg-white border-2 border-black rounded-lg px-3 py-2
          shadow-[2px_2px_0px_#000] 
          focus:outline-none focus:ring-0
          font-semibold
          ${className}
        `}
      />
    </div>
  )
}