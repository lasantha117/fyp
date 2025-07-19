// frontend/components/MatchingKeywords.js

import React from 'react';

export default function MatchingKeywords({ job }) {
  // The component now expects a 'job' object which contains 'matching_words'
  // The 'getKeywords' function is no longer needed as keywords are provided by the backend.

  // Add a defensive check to ensure 'job' and 'matching_words' are not undefined
  if (!job || !job.matching_words) {
    console.warn("MatchingKeywords received undefined job or matching_words prop.");
    return null; // Or render a placeholder/error message
  }

  const { filename, matching_words } = job; // Destructure directly from job. Note: 'filename' might be on the 'job' object if it came from matchedResults.

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg shadow-inner">
      <h6 className="text-lg font-semibold text-gray-700 mb-3">🔍 Matching Keywords:</h6>
      <div className="mb-3">
        {/* Display the filename if available, otherwise 'N/A' */}
        <p className="text-md font-medium text-gray-600">Resume: <span className="font-normal">{filename || 'N/A'}</span></p>
        <div className="flex flex-wrap gap-2 mt-2">
          {matching_words.length > 0 ? (
            matching_words.map((word, j) => (
              <span key={j} className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium shadow-sm">
                {word}
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-sm">No significant matching keywords found.</span>
          )}
        </div>
      </div>
    </div>
  );
}
