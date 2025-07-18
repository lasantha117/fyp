// frontend/components/MatchingKeywords.js

import React from 'react';

export default function MatchingKeywords({ jobDescription, resumes }) {
  /**
   * Extracts keywords that are common between a job description and a resume.
   * Words are converted to lowercase and filtered to be longer than 3 characters.
   * @param {string} desc - The job description text.
   * @param {string} text - The resume text.
   * @returns {string[]} An array of matching keywords.
   */
  const getKeywords = (desc, text) => {
    // Split text into words, convert to lowercase, and filter out empty strings
    const jobWords = new Set(desc.toLowerCase().split(/\W+/).filter(word => word.length > 0));
    const resumeWords = new Set(text.toLowerCase().split(/\W+/).filter(word => word.length > 0));

    // Find words common to both sets and ensure they are longer than 3 characters
    const matchedWords = [...jobWords].filter(word => resumeWords.has(word) && word.length > 3);
    return matchedWords;
  };

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg shadow-inner">
      <h6 className="text-lg font-semibold text-gray-700 mb-3">🔍 Matching Keywords:</h6>
      {resumes.map((res, i) => (
        <div key={i} className="mb-3">
          <p className="text-md font-medium text-gray-600">Resume: <span className="font-normal">{res.filename}</span></p>
          <div className="flex flex-wrap gap-2 mt-2">
            {getKeywords(jobDescription, res.text).length > 0 ? (
              getKeywords(jobDescription, res.text).map((word, j) => (
                <span key={j} className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium shadow-sm">
                  {word}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">No significant matching keywords found.</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
