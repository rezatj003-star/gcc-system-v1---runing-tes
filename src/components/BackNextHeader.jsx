import React from "react";
import { useNavigate } from "react-router-dom";

export default function BackNextHeader({
  title = "",
  backLabel = "Back",
  nextLabel = "Next",
  onBack,
  onNext,
  showBack = true,
  showNext = false,
  className = "",
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    // default: go back to previous page
    navigate(-1);
  };

  const handleNext = () => {
    if (typeof onNext === "function") {
      onNext();
      return;
    }
    // default: do nothing (pages can override)
  };

  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${className}`}>
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={handleBack}
            className="px-3 py-1 bg-gray-100 border rounded text-sm font-medium hover:bg-gray-200"
            aria-label="Back"
          >
            {backLabel}
          </button>
        )}
      </div>

      <h2 className="text-lg font-bold text-center flex-1">{title}</h2>

      <div className="flex items-center gap-2">
        {showNext && (
          <button
            onClick={handleNext}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            aria-label="Next"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
