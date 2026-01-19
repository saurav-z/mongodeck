  import React, { useState, useEffect } from 'react';

interface JsonEditorProps {
  initialValue: object;
  onChange: (value: object | null) => void;
  height?: string;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ initialValue, onChange, height = '300px' }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(initialValue, null, 2));
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setText(newVal);
    try {
      const parsed = JSON.parse(newVal);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setError((err as Error).message);
      onChange(null); // Signal invalid JSON
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <textarea
        className={`w-full p-4 font-mono text-sm bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none`}
        style={{ height }}
        value={text}
        onChange={handleChange}
        spellCheck={false}
      />
      {error && (
        <div className="mt-2 text-xs text-red-400 font-mono">
          Syntax Error: {error}
        </div>
      )}
    </div>
  );
};

export default JsonEditor;
