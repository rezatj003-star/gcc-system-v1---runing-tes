export default function BrutButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      {...props}
      className={`
        bg-yellow-300 border-2 border-black px-4 py-2
        rounded-lg font-bold
        shadow-[3px_3px_0px_#000]
        hover:-translate-x-1 hover:-translate-y-1
        hover:shadow-[5px_5px_0px_#000]
        transition-all
        ${className}
      `}
    >
      {children}
    </button>
  )
}