import React, { useState, useRef } from 'react';

interface DataPoint {
  x: number;
  y: number;
}

interface DataInputProps {
  onDataAdd: (point: DataPoint) => void;
  onClear: () => void;
}

export const DataInput: React.FC<DataInputProps> = ({ onDataAdd, onClear }) => {
  const [x, setX] = useState<string>('');
  const [y, setY] = useState<string>('');
  const xInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const xNum = parseFloat(x);
    const yNum = parseFloat(y);
    
    if (!isNaN(xNum) && !isNaN(yNum)) {
      onDataAdd({ x: xNum, y: yNum });
      setX('');
      setY('');
      xInputRef.current?.focus();
    }
  };

  const handleYKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const xNum = parseFloat(x);
      const yNum = parseFloat(y);
      
      if (!isNaN(xNum) && !isNaN(yNum)) {
        onDataAdd({ x: xNum, y: yNum });
        setX('');
        setY('');
        xInputRef.current?.focus();
      }
    }
  };

  return (
    <div className="data-input">
      <h3>Enter Data Points</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="x-value">X Value: </label>
          <input
            id="x-value"
            ref={xInputRef}
            type="number"
            value={x}
            onChange={(e) => setX(e.target.value)}
            step="any"
            required
          />
        </div>
        <div>
          <label htmlFor="y-value">Y Value: </label>
          <input
            id="y-value"
            type="number"
            value={y}
            onChange={(e) => setY(e.target.value)}
            onKeyDown={handleYKeyDown}
            step="any"
            required
          />
        </div>
        <div>
          <button type="submit">Add Point</button>
          <button type="button" onClick={onClear}>Clear All</button>
        </div>
      </form>
    </div>
  );
};
