/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import "../styles-ui.css";

const Console: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");

  const handleConsoleLog = (message: any) => {
    const formattedMessage =
      typeof message === "object"
        ? JSON.stringify(message, null, 2)
        : String(message);
    setLogs((prevLogs) => [...prevLogs, formattedMessage]);
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleExecute = () => {
    try {
      const result = eval(input); // Be careful with eval in production code
      handleConsoleLog(result);
    } catch (error: any) {
      handleConsoleLog(`Error: ${error.message}`);
    }
    setInput("");
  };

  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = (message: any) => {
      handleConsoleLog(message);
      originalConsoleLog(message);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  return (
    <div className="console max-h-1/2">
      <div className="console-logs">
        {logs.map((log, index) => (
          <div key={index} className="console-log">
            {log}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={handleInput}
        onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") handleExecute();
        }}
        placeholder="Enter JavaScript code"
      />
    </div>
  );
};

export default Console;
