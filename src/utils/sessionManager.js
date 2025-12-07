const SESSION_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours
const INACTIVITY_WARNING_TIME = 30 * 60 * 1000 // 30 mins warning before logout
const CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

export class SessionManager {
  constructor() {
    this.sessionCheckInterval = null
    this.inactivityTimer = null
    this.isWarningShown = false
  }

  // Initialize session manager
  init() {
    this.startSessionCheck()
    this.startInactivityTracking()
  }

  // Start periodic session validation
  startSessionCheck() {
    this.sessionCheckInterval = setInterval(() => {
      const authData = JSON.parse(localStorage.getItem("user") || "{}")
      const loginTime = Number(localStorage.getItem("loginTime") || 0)

      if (!loginTime) return

      const sessionAge = Date.now() - loginTime

      if (sessionAge > SESSION_TIMEOUT) {
        this.handleSessionTimeout()
      } else if (sessionAge > INACTIVITY_WARNING_TIME && !this.isWarningShown) {
        this.showInactivityWarning(sessionAge)
      }
    }, CHECK_INTERVAL)
  }

  startInactivityTracking() {
    const resetInactivityTimer = () => {
      clearTimeout(this.inactivityTimer)
      this.isWarningShown = false

      // Update last activity time
      localStorage.setItem("lastActivity", Date.now())
    }

    // Listen to user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"]
    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer, true)
    })
  }

  // Handle session timeout
  handleSessionTimeout() {
    this.clearSession()
    window.location.href = "/login?expired=true"
  }

  // Show inactivity warning
  showInactivityWarning(sessionAge) {
    this.isWarningShown = true
    const timeRemaining = Math.floor((SESSION_TIMEOUT - sessionAge) / 1000 / 60)

    // Show warning notification (implement based on your UI library)
    console.warn(`Session akan berakhir dalam ${timeRemaining} menit`)

    // You can dispatch an event here to show a toast/modal
    window.dispatchEvent(
      new CustomEvent("sessionWarning", {
        detail: { timeRemaining },
      }),
    )
  }

  // Clear session data
  clearSession() {
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    localStorage.removeItem("loginTime")
    localStorage.removeItem("lastActivity")
    clearInterval(this.sessionCheckInterval)
  }

  // Get session info
  getSessionInfo() {
    const loginTime = Number(localStorage.getItem("loginTime") || 0)
    if (!loginTime) return null

    const sessionAge = Date.now() - loginTime
    const timeRemaining = SESSION_TIMEOUT - sessionAge

    return {
      isActive: timeRemaining > 0,
      timeRemaining,
      sessionAge,
      expiresAt: new Date(loginTime + SESSION_TIMEOUT),
    }
  }
}

// Global session manager instance
export const sessionManager = new SessionManager()
