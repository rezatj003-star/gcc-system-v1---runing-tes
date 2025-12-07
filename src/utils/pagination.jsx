"use client"

// PAGINATION UTILITY
export const usePagination = (items, itemsPerPage = 10) => {
  const totalPages = Math.ceil(items.length / itemsPerPage)

  const getPage = (pageNumber) => {
    const startIndex = (pageNumber - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }

  return {
    totalPages,
    itemsPerPage,
    getPage,
    getTotalItems: () => items.length,
  }
}

// PAGINATION COMPONENT
export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-between mt-4 px-4 py-2 bg-slate-50 rounded-lg">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn btn-secondary btn-small disabled:opacity-50"
      >
        Previous
      </button>

      <div className="flex gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 rounded text-sm ${
              currentPage === page ? "bg-blue-600 text-white" : "bg-white border border-slate-300 hover:bg-slate-100"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn btn-secondary btn-small disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}
