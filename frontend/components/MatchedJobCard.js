// frontend/components/MatchedJobCard.js
import React from 'react';

const MatchedJobCard = ({ job }) => {
  // Add a defensive check to ensure 'job' is not undefined before accessing its properties
  if (!job) {
    console.warn("MatchedJobCard received undefined job prop.");
    return null; // Or render a placeholder/error message
  }

  return (
    <div className="border-2 rounded-2xl p-4 m-4 flex flex-col md:flex-row justify-between items-center shadow-md bg-white">
      <div className="text-left w-full md:w-3/4 mb-4 md:mb-0">
        <p className="mb-1">
          <strong className="text-gray-800">Job Title:</strong> {job.Job_Title}
        </p>
        <p className="mb-1">
          <strong className="text-gray-800">Company Name:</strong> {job.Company_Name}
        </p>
        <p className="mb-1">
          <strong className="text-gray-800">Job Description:</strong> {job.Job_Description}
        </p>
        {/* Display other job details if available */}
        {job.Required_Skills && <p className="mb-1"><strong className="text-gray-800">Required Skills:</strong> {job.Required_Skills}</p>}
        {job.Education_Level && <p className="mb-1"><strong className="text-gray-800">Education Level:</strong> {job.Education_Level}</p>}
        {job.Experience_Required && <p className="mb-1"><strong className="text-gray-800">Experience Required:</strong> {job.Experience_Required}</p>}
        {job.Location && <p className="mb-1"><strong className="text-gray-800">Location:</strong> {job.Location}</p>}
      
      </div>
      <div className="text-center w-full md:w-1/4 flex flex-col items-center">
        <div className="w-24 h-24 mx-auto rounded-full border-4 border-green-500 flex items-center justify-center text-2xl font-bold text-green-700 bg-green-100">
          {job.match_percentage}%
        </div>
        <button
          className="mt-4 px-6 py-2 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition duration-300 ease-in-out shadow-sm"
          onClick={() => window.open(`https://apply-now.com/${job.Job_Title.replace(/\s+/g, '-')}`, '_blank')} // Example dynamic apply link
        >
          APPLY
        </button>
      </div>
    </div>
  );
};

export default MatchedJobCard;
