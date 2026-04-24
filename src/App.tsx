import { useState, useCallback } from "react";

interface HistoryRecord {
  id: number;
  input: string;
  output: string;
  direction: "win2mac" | "mac2win";
  timestamp: Date;
}

// Detect if a path is a Windows path
function isWindowsPath(path: string): boolean {
  // Match drive letter pattern like C:\ or C:/
  if (/^[A-Za-z]:[\\\/]/.test(path)) return true;
  // Match UNC path like \\server\share
  if (/^\\\\/.test(path)) return true;
  // If it contains backslashes, likely Windows
  if (/\\/.test(path) && !/\//.test(path)) return true;
  return false;
}

// Detect if a path is a macOS path
function isMacPath(path: string): boolean {
  if (/^\//.test(path)) return true;
  if (/~\//.test(path)) return true;
  return false;
}

// Convert Windows path to macOS path
function windowsToMac(winPath: string): string {
  let result = winPath.trim();

  // Handle UNC paths: \\server\share\path → smb://server/share/path
  if (/^\\\\/.test(result)) {
    result = result.replace(/^\\\\/, "smb://");
    result = result.replace(/\\/g, "/");
    return result;
  }

  // Handle R:\ drive: R:\subpath → smb://robeiisilon1/BEI/ROCOMMON/subpath
  if (/^[Rr]:[\\\/]/.test(result)) {
    result = result.replace(/^[Rr]:[\\\/]/, "");
    result = result.replace(/\\/g, "/");
    result = "smb://robeiisilon1/BEI/ROCOMMON/" + result;
    // Remove trailing slash if original had no subpath
    if (result.endsWith("/")) {
      result = result.slice(0, -1);
    }
    return result;
  }

  // Remove drive letter: C:\Users\... → \Users\...
  result = result.replace(/^[A-Za-z]:[\\\/]/, "/");

  // Convert backslashes to forward slashes
  result = result.replace(/\\/g, "/");

  // Handle common Windows→Mac path mappings
  result = result.replace(/^\/[Uu]sers\//, "/Users/");
  result = result.replace(/^\/[Pp]rogram [Ff]iles\//, "/Applications/");
  result = result.replace(/^\/[Pp]rogram[Ff]iles\//, "/Applications/");
  result = result.replace(/^\/[Aa]pp[Dd]ata\/[Rr]oaming\//, "/Library/Application Support/");
  result = result.replace(/^\/[Dd]esktop\//, "/Desktop/");
  result = result.replace(/^\/[Dd]ocuments\//, "/Documents/");
  result = result.replace(/^\/[Dd]ownloads\//, "/Downloads/");

  // Ensure leading slash
  if (!result.startsWith("/")) {
    result = "/" + result;
  }

  return result;
}

// Convert macOS path to Windows path
function macToWindows(macPath: string): string {
  let result = macPath.trim();

  // Handle smb:// paths
  if (/^smb:\/\//.test(result)) {
    result = result.replace(/^smb:\/\//, "\\\\");
    result = result.replace(/\//g, "\\");
    return result;
  }

  // Handle ~ (home directory)
  if (result.startsWith("~/")) {
    result = result.replace(/^~/, "/Users");
  }

  // Convert forward slashes to backslashes
  result = result.replace(/\//g, "\\");

  // Remove leading backslash and add C:
  if (result.startsWith("\\")) {
    result = "C:" + result;
  } else {
    result = "C:\\" + result;
  }

  // Handle common Mac→Windows path mappings
  result = result.replace(/\\Users\\/, "\\Users\\");
  result = result.replace(/\\Applications\\/, "\\Program Files\\");
  result = result.replace(/\\Library\\Application Support\\/, "\\AppData\\Roaming\\");

  return result;
}

function convertPath(input: string): { output: string; direction: "win2mac" | "mac2win" } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isWindowsPath(trimmed)) {
    return { output: windowsToMac(trimmed), direction: "win2mac" };
  } else if (isMacPath(trimmed)) {
    return { output: macToWindows(trimmed), direction: "mac2win" };
  }

  // Default: try to detect by separator type
  if (trimmed.includes("\\") && !trimmed.includes("/")) {
    return { output: windowsToMac(trimmed), direction: "win2mac" };
  } else if (trimmed.includes("/") && !trimmed.includes("\\")) {
    return { output: macToWindows(trimmed), direction: "mac2win" };
  }

  return null;
}

function DirectionBadge({ direction }: { direction: "win2mac" | "mac2win" }) {
  if (direction === "win2mac") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
        <span>Windows</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <span>macOS</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
      <span>macOS</span>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <span>Windows</span>
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-blue-200 hover:border-blue-300"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          复制
        </>
      )}
    </button>
  );
}

export default function App() {
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [currentDirection, setCurrentDirection] = useState<"win2mac" | "mac2win" | null>(null);
  const handleConvert = useCallback(() => {
    const result = convertPath(inputPath);
    if (result) {
      setOutputPath(result.output);
      setCurrentDirection(result.direction);
      const record: HistoryRecord = {
        id: Date.now(),
        input: inputPath.trim(),
        output: result.output,
        direction: result.direction,
        timestamp: new Date(),
      };
      setHistory((prev) => [record, ...prev]);
    } else {
      setOutputPath("无法识别路径格式，请输入有效的 Windows 或 macOS 路径");
      setCurrentDirection(null);
    }
  }, [inputPath]);

  const handleInputChange = useCallback((value: string) => {
    setInputPath(value);
    // Auto-convert on input
    if (value.trim()) {
      const result = convertPath(value);
      if (result) {
        setOutputPath(result.output);
        setCurrentDirection(result.direction);
      } else {
        setOutputPath("");
        setCurrentDirection(null);
      }
    } else {
      setOutputPath("");
      setCurrentDirection(null);
    }
  }, []);

  const handleConvertClick = useCallback(() => {
    handleConvert();
  }, [handleConvert]);

  const handleHistoryClick = useCallback((record: HistoryRecord) => {
    setInputPath(record.input);
    setOutputPath(record.output);
    setCurrentDirection(record.direction);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConvertClick();
      }
    },
    [handleConvertClick]
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-blue-500 shadow-sm">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">路径转换工具</h1>
        </div>
        <p className="text-sm text-gray-500">Windows 与 macOS 路径地址互相转换 · 自动识别方向 · 即时转换</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-100/50 overflow-hidden">
        {/* Input Section */}
        <div className="p-5 border-b border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white text-xs font-bold">1</span>
              输入路径
            </label>
            <div className="flex items-center gap-2">
              {inputPath.trim() && (
                <span className="text-xs text-gray-400">
                  {isWindowsPath(inputPath.trim()) ? "Windows 路径" : isMacPath(inputPath.trim()) ? "macOS 路径" : "未知格式"}
                </span>
              )}
              <CopyButton text={inputPath} />
            </div>
          </div>
          <textarea
            value={inputPath}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入路径，例如：C:\Users\name\Documents 或 /Users/name/Documents"
            className="w-full h-28 px-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-mono text-gray-800 placeholder:text-gray-300 resize-none transition-all bg-white"
            spellCheck={false}
          />
        </div>

        {/* Convert Button */}
        <div className="flex justify-center -mt-0 relative z-10">
          <button
            onClick={handleConvertClick}
            disabled={!inputPath.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold rounded-full shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none -my-3"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
            转换并记录
          </button>
        </div>

        {/* Output Section */}
        <div className="p-5 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white text-xs font-bold">2</span>
              转换结果
            </label>
            <div className="flex items-center gap-2">
              {currentDirection && <DirectionBadge direction={currentDirection} />}
              <CopyButton text={outputPath} />
            </div>
          </div>
          <div
            className="w-full min-h-[7rem] px-4 py-3 rounded-xl border-2 bg-gray-50 text-sm font-mono text-gray-800 break-all whitespace-pre-wrap transition-all"
            style={{
              borderColor: outputPath
                ? outputPath.startsWith("无法识别")
                  ? "#fca5a5"
                  : "#93c5fd"
                : "#e5e7eb",
              backgroundColor: outputPath
                ? outputPath.startsWith("无法识别")
                  ? "#fef2f2"
                  : "#eff6ff"
                : "#f9fafb",
            }}
          >
            {outputPath || (
              <span className="text-gray-300">转换结果将在此显示...</span>
            )}
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="w-full max-w-2xl mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            转换历史
            <span className="text-xs font-normal text-gray-400">（本次会话）</span>
          </h2>
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              清空记录
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-blue-200 p-8 text-center">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-blue-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-sm text-gray-400">暂无转换记录</p>
            <p className="text-xs text-gray-300 mt-1">输入路径并点击「转换并记录」开始使用</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {history.map((record) => (
              <div
                key={record.id}
                onClick={() => handleHistoryClick(record)}
                className="bg-white rounded-xl border border-blue-100 hover:border-blue-300 p-4 cursor-pointer transition-all hover:shadow-md hover:shadow-blue-50 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <DirectionBadge direction={record.direction} />
                  <span className="text-xs text-gray-300 group-hover:text-gray-400 transition-colors">
                    {formatTime(record.timestamp)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-xs text-gray-300 mt-0.5 w-14 text-right">输入</span>
                    <code className="text-xs font-mono text-gray-600 break-all">{record.input}</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-xs text-gray-300 mt-0.5 w-14 text-right">输出</span>
                    <code className="text-xs font-mono text-blue-600 break-all">{record.output}</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-300">
        <p>提示：路径将在输入时自动转换，点击「转换并记录」可保存至历史记录</p>
        <p className="mt-1">支持 Windows 绝对路径、UNC 路径、macOS 绝对路径及家目录路径</p>
      </div>
    </div>
  );
}
