export default function BrutCard({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border-2 border-black rounded-xl p-4 
        shadow-[4px_4px_0px_#000]
        hover:-translate-x-1 hover:-translate-y-1 
        hover:shadow-[6px_6px_0px_#000]
        transition-all cursor-pointer
        ${className}
      `}
    >
      {children}
    </div>
  )
}