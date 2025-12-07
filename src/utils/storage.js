// Small utility for consistent localStorage usage and backward compatibility.
export function setJSON(key, value) {
  try {
    const v = JSON.stringify(value)
    localStorage.setItem(key, v)
  } catch (err) {
    localStorage.setItem(key, String(value))
  }
}

export function getJSON(key, fallback = null) {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw)
  } catch (err) {
    // fallback to raw string value if not JSON
    return raw
  }
}

// High-level helpers for module selection & user
export function getModule() {
  const v = getJSON("currentModule", "collection")
  // support legacy storage as simple string value
  if (!v) return "collection"
  // If object: { value: "collection" }
  if (typeof v === "object" && v.value) return v.value
  if (typeof v === "string") return v
  return "collection"
}

export function setModule(value) {
  setJSON("currentModule", { value })
}

export function getUser() {
  return getJSON("auth", null) // expected format: { user: {...}, token: '...' }
}

export function setUser(userObj) {
  setJSON("auth", userObj)
}

export function clearAll() {
  localStorage.clear()
}
