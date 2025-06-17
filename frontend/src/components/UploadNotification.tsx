interface UploadNotificationProps {
  filenames: string[];
  progress: number[];
}
export default function UploadNotification({ filenames, progress }: UploadNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-lg rounded-lg p-4 w-80">
      {filenames.map((filename, index) => (
        <div key={index}>
          <p className="font-medium truncate">{filename}</p>
          <div className="w-full bg-gray-200 h-2 rounded mt-2">
            <div
              className="bg-blue-500 h-2 rounded transition-all duration-300"
              style={{ width: `${progress[index]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

