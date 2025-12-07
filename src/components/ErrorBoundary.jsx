"use client"

import { Component } from "react"
import { Link } from "react-router-dom"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prev) => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1,
    }))
    console.error("Error caught by boundary:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h1>
            <p className="text-slate-600 mb-4">Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.</p>

            {process.env.NODE_ENV === "development" && (
              <details className="text-left bg-slate-100 p-3 rounded mb-4 text-xs">
                <summary className="cursor-pointer font-semibold">Detail Error (Development Only)</summary>
                <p className="mt-2 text-red-600 font-mono break-words">{this.state.error?.toString()}</p>
                <p className="mt-2 text-slate-600 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </p>
              </details>
            )}

            <div className="flex gap-2">
              <button onClick={this.handleReset} className="btn btn-primary flex-1">
                Coba Lagi
              </button>
              <Link to="/menu" className="btn btn-secondary flex-1">
                Kembali ke Home
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
