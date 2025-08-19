import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import regression from 'regression';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionChartProps {
  data: DataPoint[];
  hoveredPointIndex?: number | null;
}

export const RegressionChart: React.FC<RegressionChartProps> = ({ data, hoveredPointIndex }) => {
  const calculateRegression = () => {
    if (data.length < 2) return null;
    
    const points: [number, number][] = data.map(point => [point.x, point.y]);
    const result = regression.linear(points);
    
    // Get min and max x values to draw regression line
    const xValues = data.map(point => point.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    
    // Calculate y values for regression line
    const startY = result.predict(minX)[1];
    const endY = result.predict(maxX)[1];
    
    return {
      points: [
        { x: minX, y: startY },
        { x: maxX, y: endY }
      ],
      equation: result.string,
      r2: result.r2
    };
  };

  const regressionResult = calculateRegression();

  // Calculate means for hover visualization
  const meanX = data.length > 0 ? data.reduce((sum, point) => sum + point.x, 0) / data.length : 0;
  const meanY = data.length > 0 ? data.reduce((sum, point) => sum + point.y, 0) / data.length : 0;

  // Create datasets for chart
  const datasets = [
    {
      label: 'Data Points',
      data: data,
      backgroundColor: data.map((_, index) => hoveredPointIndex === index ? 'rgba(37, 99, 235, 0.9)' : '#2563eb'),
      borderColor: data.map((_, index) => hoveredPointIndex === index ? 'rgba(37, 99, 235, 0.4)' : '#1d4ed8'),
      pointRadius: 6, // Consistent size
      borderWidth: data.map((_, index) => hoveredPointIndex === index ? 8 : 2), // Glow effect with thicker border
      type: 'scatter' as const,
    } as any,
    ...(regressionResult ? [{
      label: 'Regression Line',
      data: regressionResult.points,
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#1e40af',
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    }] : []),
  ];

  // Add mean lines and difference indicators when hovering
  if (hoveredPointIndex !== null && hoveredPointIndex !== undefined && data[hoveredPointIndex]) {
    const hoveredPoint = data[hoveredPointIndex];
    const xValues = data.map(point => point.x);
    const yValues = data.map(point => point.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    // Add vertical X mean line
    datasets.push({
      label: 'X Mean',
      data: [
        { x: meanX, y: minY },
        { x: meanX, y: maxY }
      ],
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#64748b',
      borderDash: [5, 5] as any,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    } as any);

    // Add horizontal Y mean line
    datasets.push({
      label: 'Y Mean',
      data: [
        { x: minX, y: meanY },
        { x: maxX, y: meanY }
      ],
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#64748b',
      borderDash: [5, 5] as any,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    } as any);

    // Add X difference line (horizontal from X mean to point)
    datasets.push({
      label: 'X Difference',
      data: [
        { x: meanX, y: hoveredPoint.y },
        { x: hoveredPoint.x, y: hoveredPoint.y }
      ],
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#06b6d4',
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
    } as any);

    // Calculate offset amount for line separation
    const xRange = maxX - minX;
    const offsetAmount = xRange * 0.01; // Larger offset (1% of x-range) for better separation
    
    // Calculate predicted y value for residual line
    const points: [number, number][] = data.map(point => [point.x, point.y]);
    const result = regression.linear(points);
    const yPredicted = result.predict(hoveredPoint.x)[1];
    
    // Determine if this is at the edges to prevent axis scaling issues
    const isHighestX = hoveredPoint.x === maxX;
    const isLowestX = hoveredPoint.x === minX;
    
    // Add Y difference line (vertical from Y mean to point)
    // Smart offset logic to prevent chart expansion
    let yDiffOffset, residualOffset;
    
    if (isLowestX) {
      // For leftmost point: both lines go to the right to avoid expanding left
      yDiffOffset = offsetAmount * 0.5;
      residualOffset = offsetAmount * 1.5;
    } else if (isHighestX) {
      // For rightmost point: both lines go to the left to avoid expanding right
      yDiffOffset = -offsetAmount * 1.5;
      residualOffset = -offsetAmount * 0.5;
    } else {
      // For middle points: spread them on both sides
      yDiffOffset = -offsetAmount;
      residualOffset = offsetAmount;
    }
    
    datasets.push({
      label: 'Y Difference',
      data: [
        { x: hoveredPoint.x + yDiffOffset, y: meanY },
        { x: hoveredPoint.x + yDiffOffset, y: hoveredPoint.y }
      ],
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#f59e0b',
      borderWidth: 4,
      borderDash: [6, 6] as any, // Different dash pattern from residual
      pointRadius: 0,
      fill: false,
    } as any);
    
    // Add residual line (vertical from regression line to actual point)
    
    datasets.push({
      label: 'Residual (y - ŷ)',
      data: [
        { x: hoveredPoint.x + residualOffset, y: yPredicted },
        { x: hoveredPoint.x + residualOffset, y: hoveredPoint.y }
      ],
      type: 'scatter' as const,
      showLine: true,
      borderColor: '#dc2626',
      borderDash: [8, 4] as any, // Different dash pattern from Y difference
      borderWidth: 5,
      pointRadius: 0,
      fill: false,
    } as any);
    
    // Add small markers at the ends of the residual line for extra visibility
    datasets.push({
      label: 'Residual Markers',
      data: [
        { x: hoveredPoint.x + residualOffset, y: yPredicted },
        { x: hoveredPoint.x + residualOffset, y: hoveredPoint.y }
      ],
      type: 'scatter' as const,
      showLine: false,
      backgroundColor: '#dc2626',
      borderColor: '#ffffff',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 4,
    } as any);
    
    // Add markers for Y difference line for extra visibility
    datasets.push({
      label: 'Y Difference Markers',
      data: [
        { x: hoveredPoint.x + yDiffOffset, y: meanY },
        { x: hoveredPoint.x + yDiffOffset, y: hoveredPoint.y }
      ],
      type: 'scatter' as const,
      showLine: false,
      backgroundColor: '#f59e0b',
      borderColor: '#ffffff',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 3,
    } as any);
  }

  const chartData = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'X Values',
        },
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Y Values',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          },
          filter: function(legendItem: any) {
            // Hide the marker datasets from legend to reduce clutter
            return legendItem.text !== 'Residual Markers' && legendItem.text !== 'Y Difference Markers';
          }
        },
        // Reserve fixed space for the legend
        maxHeight: 80,
        fullSize: true
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `(${context.parsed.x}, ${context.parsed.y})`;
          },
        },
      },
    },
    layout: {
      padding: {
        top: 10
      }
    },
  };

  return (
    <div className="regression-chart">
      <Scatter options={options} data={chartData} />
    </div>
  );
};
