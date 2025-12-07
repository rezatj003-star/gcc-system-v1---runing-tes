import React from "react";

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="hidden md:block bg-slate-50 border-t border-slate-200 px-6 py-4 text-center text-sm text-slate-600">
      <p>&copy; {year} PT Green Construction City. All rights reserved.</p>
    </footer>
  )
}
