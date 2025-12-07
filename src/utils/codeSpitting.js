export const dynamicImport = (path) => {
  return import(path)
}

// Route-based code splitting
export const lazyRoute = (path) => {
  return import(`../${path}`).then((module) => ({
    default: module.default || module,
  }))
}

// Prefetch chunks on route navigation
export const prefetchRoute = (path) => {
  // Preload route chunk before navigation
  const link = document.createElement("link")
  link.rel = "prefetch"
  link.href = path
  document.head.appendChild(link)
}
