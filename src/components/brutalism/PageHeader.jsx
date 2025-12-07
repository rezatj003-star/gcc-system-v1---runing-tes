export default function PageHeader({ title, children }) {
  return (
    <div
      className="
        mb-6 p-4 bg-yellow-300 border-2 border-black rounded-xl
        shadow-[4px_4px_0px_#000] flex justify-between items-center
      "
    >
      <h1 className="text-2xl font-black">{title}</h1>
      {children}
    </div>
  )
}