import { NavLink } from "react-router-dom"
import { Home, Users, ShoppingBag, Calculator } from "lucide-react"

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/collection", label: "Collection", icon: Users },
  { to: "/kasir", label: "Kasir", icon: Calculator },
  { to: "/master", label: "Master", icon: ShoppingBag },
]

export default function BrutBottomNav() {
  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-blue-300 border-t-4 border-black
        shadow-[0px_-4px_0px_#000]
        flex justify-around py-3
      "
    >
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <NavLink
            key={i}
            to={item.to}
            className={({ isActive }) =>
              `
                flex flex-col items-center gap-1 font-bold
                ${isActive ? "text-black" : "text-gray-700"}
              `
            }
          >
            <div
              className="
                bg-white border-2 border-black rounded-lg p-2
                shadow-[2px_2px_0px_#000]
              "
            >
              <Icon size={20} />
            </div>
            <span className="text-xs font-black">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}