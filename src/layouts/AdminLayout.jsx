import React from "react";
import ModuleLayoutComponent from "D:/gcc-system-v1/src/layouts/ModuleLayout.jsx"; // explicit extension

export default function AdminLayout({ children }) {
  return <ModuleLayoutComponent>{children}</ModuleLayoutComponent>;
}

export { AdminLayout };
