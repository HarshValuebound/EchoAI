import React from "react";

interface Props {
  isUploaded: boolean;
  setIsUploaded: (isUploaded: boolean) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function CSVUpload({ isUploaded, fileName, onChange }: Props) {
  return (
    <div className="p-2 bg-white rounded-xl w-full">
      <input
        type="file"
        accept=".csv"
        onChange={onChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-indigo-600 file:text-white
          hover:file:bg-indigo-700"
      />
    </div>
  );
}

export default CSVUpload; 