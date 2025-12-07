import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

export default function BrutHeader({ title, back = false }) {
  const navigate = useNavigate()

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-40
        bg-yellow-300 border-b-4 border-black
        shadow-[4px_4px_0px_#000]
        px-4 py-3 flex items-center gap-3
      "
    >
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="
            bg-white border-2 border-black rounded-lg p-2
            shadow-[2px_2px_0px_#000]
            hover:-translate-x-1 hover:-translate-y-1
            hover:shadow-[4px_4px_0px_#000]
            transition-all
          "
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <h1 className="text-xl font-black">{title}</h1>
    </header>
  )
}