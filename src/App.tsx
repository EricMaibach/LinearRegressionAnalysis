import { useState } from 'react'
import './App.css'
import { DataInput } from './components/DataInput'
import { RegressionChart } from './components/RegressionChart'
import { RegressionCalculations } from './components/RegressionCalculations'
import { GemmaChatbot } from './components/GemmaChatbot'
import { InlineMath } from 'react-katex'

interface DataPoint {
  x: number;
  y: number;
}

export default function App() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [highlightType, setHighlightType] = useState<'scp' | 'sxx' | 'ssres' | 'sstot' | 'slope' | 'intercept' | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');
  const [calculationsCollapsed, setCalculationsCollapsed] = useState(false);

  const handleDataAdd = (point: DataPoint) => {
    setDataPoints([...dataPoints, point]);
  };

  const handleClear = () => {
    setDataPoints([]);
  };

  const handleHighlight = (type: 'scp' | 'sxx' | 'ssres' | 'sstot' | 'slope' | 'intercept' | null) => {
    setHighlightType(type);
  };

  const handlePointHover = (index: number | null) => {
    setHoveredPointIndex(index);
  };

  const handleDeletePoint = (index: number) => {
    setDataPoints(dataPoints.filter((_, i) => i !== index));
  };

  return (
    <div className="container">
      <div className="two-panel-layout">
        <div className="main-panel">
          <div className="data-input-section">
            <DataInput onDataAdd={handleDataAdd} onClear={handleClear} />
          </div>
          
          {dataPoints.length > 0 && (
            <>
              <div className="tab-navigation">
                <button 
                  className={`tab-button ${activeTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                >
                  📊 Chart
                </button>
                <button 
                  className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
                  onClick={() => setActiveTab('table')}
                >
                  📋 Table
                </button>
              </div>
              
              <div className="desktop-content">
                <div className="chart-container">
                  <RegressionChart 
                    data={dataPoints} 
                    hoveredPointIndex={hoveredPointIndex}
                  />
                </div>
                <div className="data-table">
                  <h3>Data Points</h3>
              <table>
                <thead>
                  <tr className="column-group-headers">
                    <th colSpan={3} className="group-raw-data">Raw Data</th>
                    <th colSpan={3} className="group-deviations">Deviations</th>
                    <th colSpan={2} className="group-regression">Regression Calculations</th>
                    <th colSpan={2} className="group-r2">R² Components</th>
                  </tr>
                  <tr>
                    <th className="col-raw-data header-with-tooltip" data-tooltip="Observed x-value (independent variable)">
                      <InlineMath math="x" />
                    </th>
                    <th className="col-raw-data header-with-tooltip" data-tooltip="Observed y-value (dependent variable)">
                      <InlineMath math="y" />
                    </th>
                    <th className="col-raw-data header-with-tooltip" data-tooltip="Predicted y-value from the regression line">
                      <InlineMath math="\hat{y}" />
                    </th>
                    <th className="col-deviations header-with-tooltip" data-tooltip="Difference between the x-value and the mean of all x-values">
                      <InlineMath math="x - \bar{x}" />
                    </th>
                    <th className="col-deviations header-with-tooltip" data-tooltip="Difference between the y-value and the mean of all y-values">
                      <InlineMath math="y - \bar{y}" />
                    </th>
                    <th className="col-deviations header-with-tooltip" data-tooltip="Residual: difference between observed and predicted y-values">
                      <InlineMath math="y - \hat{y}" />
                    </th>
                    <th className={`col-regression header-with-tooltip ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`} data-tooltip="Squared deviation of x from its mean (used to calculate slope)">
                      <InlineMath math="(x - \bar{x})^2" />
                    </th>
                    <th className={`col-regression header-with-tooltip ${highlightType === 'scp' ? 'highlight-scp' : ''}`} data-tooltip="Cross-product of x and y deviations from their means (used to calculate slope)">
                      <InlineMath math="(x - \bar{x})(y - \bar{y})" />
                    </th>
                    <th className={`col-r2 header-with-tooltip ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`} data-tooltip="Squared residual: measures unexplained variation (used in R² calculation)">
                      <InlineMath math="(y - \hat{y})^2" />
                    </th>
                    <th className={`col-r2 header-with-tooltip ${highlightType === 'sstot' ? 'highlight-sstot' : ''}`} data-tooltip="Squared deviation of y from its mean: measures total variation (used in R² calculation)">
                      <InlineMath math="(y - \bar{y})^2" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dataPoints.map((point, index) => {
                    const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / dataPoints.length;
                    const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
                    const xDiff = point.x - meanX;
                    const yDiff = point.y - meanY;
                    
                    // Calculate slope and intercept for predicted y values
                    const n = dataPoints.length;
                    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
                    const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
                    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
                    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
                    const sxx = sumXX - (sumX * sumX) / n;
                    const scp = sumXY - (sumX * sumY) / n;
                    const slope = scp / sxx;
                    const intercept = meanY - slope * meanX;
                    
                    const yPredicted = slope * point.x + intercept;
                    const residual = point.y - yPredicted;
                    return (
                      <tr 
                        key={index} 
                        className="data-row"
                        onMouseEnter={() => handlePointHover(index)}
                        onMouseLeave={() => handlePointHover(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="col-raw-data">{point.x.toFixed(4)}</td>
                        <td className="col-raw-data">{point.y.toFixed(4)}</td>
                        <td className="col-raw-data">{yPredicted.toFixed(4)}</td>
                        <td 
                          className="col-deviations"
                          style={{ 
                            backgroundColor: hoveredPointIndex === index ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                            transition: 'background-color 0.2s ease-in-out'
                          }}
                        >
                          {xDiff.toFixed(4)}
                        </td>
                        <td 
                          className="col-deviations"
                          style={{ 
                            backgroundColor: hoveredPointIndex === index ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                            transition: 'background-color 0.2s ease-in-out'
                          }}
                        >
                          {yDiff.toFixed(4)}
                        </td>
                        <td 
                          className="col-deviations"
                          style={{ 
                            backgroundColor: hoveredPointIndex === index ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                            transition: 'background-color 0.2s ease-in-out'
                          }}
                        >
                          {residual.toFixed(4)}
                        </td>
                        <td className={`col-regression ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`}>{(xDiff * xDiff).toFixed(4)}</td>
                        <td className={`col-regression ${highlightType === 'scp' ? 'highlight-scp' : ''}`}>{(xDiff * yDiff).toFixed(4)}</td>
                        <td className={`col-r2 ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`}>
                          {(residual * residual).toFixed(4)}
                        </td>
                        <td className={`col-r2 ${highlightType === 'sstot' ? 'highlight-sstot' : ''} last-col-with-delete`} style={{ position: 'relative' }}>
                          {(yDiff * yDiff).toFixed(4)}
                          <button 
                            onClick={() => handleDeletePoint(index)}
                            className="row-delete-button"
                            title="Delete this data point"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="totals-label">Sums:</td>
                    <td className={`col-regression ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`}>
                      <InlineMath math={`SXX = ${dataPoints
                        .reduce((sum, point) => {
                          const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                          const xDiff = point.x - meanX;
                          return sum + xDiff * xDiff;
                        }, 0)
                        .toFixed(4)}`} />
                    </td>
                    <td className={`col-regression ${highlightType === 'scp' ? 'highlight-scp' : ''}`}>
                      <InlineMath math={`SCP = ${dataPoints
                        .reduce((sum, point) => {
                          const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                          const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                          const xDiff = point.x - meanX;
                          const yDiff = point.y - meanY;
                          return sum + xDiff * yDiff;
                        }, 0)
                        .toFixed(4)}`} />
                    </td>
                    <td className={`col-r2 ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`}>
                      <InlineMath math={`SS_{res} = ${dataPoints
                        .reduce((sum, point) => {
                          const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                          const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                          const n = dataPoints.length;
                          const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
                          const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
                          const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
                          const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
                          const sxx = sumXX - (sumX * sumX) / n;
                          const scp = sumXY - (sumX * sumY) / n;
                          const slope = scp / sxx;
                          const intercept = meanY - slope * meanX;
                          const yPredicted = slope * point.x + intercept;
                          const residual = point.y - yPredicted;
                          return sum + residual * residual;
                        }, 0)
                        .toFixed(4)}`} />
                    </td>
                    <td className={`col-r2 ${highlightType === 'sstot' ? 'highlight-sstot' : ''}`}>
                      <InlineMath math={`SS_{tot} = ${dataPoints
                        .reduce((sum, point) => {
                          const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                          const yDiff = point.y - meanY;
                          return sum + yDiff * yDiff;
                        }, 0)
                        .toFixed(4)}`} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
              </div>
              
              <div className="mobile-content">
                {activeTab === 'chart' && (
                  <div className="chart-container">
                    <RegressionChart 
                      data={dataPoints} 
                      hoveredPointIndex={hoveredPointIndex}
                    />
                  </div>
                )}
                
                {activeTab === 'table' && (
                  <div className="data-table">
                    <h3>Data Points</h3>
                    <table>
                      <thead>
                        <tr className="column-group-headers">
                          <th colSpan={3} className="group-raw-data">Raw Data</th>
                          <th colSpan={3} className="group-deviations">Deviations</th>
                          <th colSpan={2} className="group-regression">Regression Calculations</th>
                          <th colSpan={2} className="group-r2">R² Components</th>
                        </tr>
                        <tr>
                          <th className="col-raw-data header-with-tooltip" data-tooltip="Observed x-value (independent variable)">
                            <InlineMath math="x" />
                          </th>
                          <th className="col-raw-data header-with-tooltip" data-tooltip="Observed y-value (dependent variable)">
                            <InlineMath math="y" />
                          </th>
                          <th className="col-raw-data header-with-tooltip" data-tooltip="Predicted y-value from the regression line">
                            <InlineMath math="\hat{y}" />
                          </th>
                          <th className="col-deviations header-with-tooltip" data-tooltip="Difference between the x-value and the mean of all x-values">
                            <InlineMath math="x - \bar{x}" />
                          </th>
                          <th className="col-deviations header-with-tooltip" data-tooltip="Difference between the y-value and the mean of all y-values">
                            <InlineMath math="y - \bar{y}" />
                          </th>
                          <th className="col-deviations header-with-tooltip" data-tooltip="Residual: difference between observed and predicted y-values">
                            <InlineMath math="y - \hat{y}" />
                          </th>
                          <th className={`col-regression header-with-tooltip ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`} data-tooltip="Squared deviation of x from its mean (used to calculate slope)">
                            <InlineMath math="(x - \bar{x})^2" />
                          </th>
                          <th className={`col-regression header-with-tooltip ${highlightType === 'scp' ? 'highlight-scp' : ''}`} data-tooltip="Cross-product of x and y deviations from their means (used to calculate slope)">
                            <InlineMath math="(x - \bar{x})(y - \bar{y})" />
                          </th>
                          <th className={`col-r2 header-with-tooltip ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`} data-tooltip="Squared residual: measures unexplained variation (used in R² calculation)">
                            <InlineMath math="(y - \hat{y})^2" />
                          </th>
                          <th className={`col-r2 header-with-tooltip ${highlightType === 'sstot' ? 'highlight-sstot' : ''}`} data-tooltip="Squared deviation of y from its mean: measures total variation (used in R² calculation)">
                            <InlineMath math="(y - \bar{y})^2" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataPoints.map((point, index) => {
                          const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / dataPoints.length;
                          const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
                          const xDiff = point.x - meanX;
                          const yDiff = point.y - meanY;
                          
                          // Calculate slope and intercept for predicted y values
                          const n = dataPoints.length;
                          const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
                          const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
                          const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
                          const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
                          const sxx = sumXX - (sumX * sumX) / n;
                          const scp = sumXY - (sumX * sumY) / n;
                          const slope = scp / sxx;
                          const intercept = meanY - slope * meanX;
                          
                          const yPredicted = slope * point.x + intercept;
                          const residual = point.y - yPredicted;
                          return (
                            <tr 
                              key={index} 
                              className="data-row"
                              onMouseEnter={() => handlePointHover(index)}
                              onMouseLeave={() => handlePointHover(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="col-raw-data">{point.x.toFixed(4)}</td>
                              <td className="col-raw-data">{point.y.toFixed(4)}</td>
                              <td className="col-raw-data">{yPredicted.toFixed(4)}</td>
                              <td 
                                className="col-deviations"
                                style={{ 
                                  backgroundColor: hoveredPointIndex === index ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                                  transition: 'background-color 0.2s ease-in-out'
                                }}
                              >
                                {xDiff.toFixed(4)}
                              </td>
                              <td 
                                className="col-deviations"
                                style={{ 
                                  backgroundColor: hoveredPointIndex === index ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                  transition: 'background-color 0.2s ease-in-out'
                                }}
                              >
                                {yDiff.toFixed(4)}
                              </td>
                              <td 
                                className="col-deviations"
                                style={{ 
                                  backgroundColor: hoveredPointIndex === index ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                                  transition: 'background-color 0.2s ease-in-out'
                                }}
                              >
                                {residual.toFixed(4)}
                              </td>
                              <td className={`col-regression ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`}>{(xDiff * xDiff).toFixed(4)}</td>
                              <td className={`col-regression ${highlightType === 'scp' ? 'highlight-scp' : ''}`}>{(xDiff * yDiff).toFixed(4)}</td>
                              <td className={`col-r2 ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`}>
                                {(residual * residual).toFixed(4)}
                              </td>
                              <td className={`col-r2 ${highlightType === 'sstot' ? 'highlight-sstot' : ''} last-col-with-delete`} style={{ position: 'relative' }}>
                                {(yDiff * yDiff).toFixed(4)}
                                <button 
                                  onClick={() => handleDeletePoint(index)}
                                  className="row-delete-button"
                                  title="Delete this data point"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={6} className="totals-label">Sums:</td>
                          <td className={`col-regression ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`}>
                            <InlineMath math={`SXX = ${dataPoints
                              .reduce((sum, point) => {
                                const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                                const xDiff = point.x - meanX;
                                return sum + xDiff * xDiff;
                              }, 0)
                              .toFixed(4)}`} />
                          </td>
                          <td className={`col-regression ${highlightType === 'scp' ? 'highlight-scp' : ''}`}>
                            <InlineMath math={`SCP = ${dataPoints
                              .reduce((sum, point) => {
                                const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                                const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                                const xDiff = point.x - meanX;
                                const yDiff = point.y - meanY;
                                return sum + xDiff * yDiff;
                              }, 0)
                              .toFixed(4)}`} />
                          </td>
                          <td className={`col-r2 ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`}>
                            <InlineMath math={`SS_{res} = ${dataPoints
                              .reduce((sum, point) => {
                                const meanX = dataPoints.reduce((s, p) => s + p.x, 0) / dataPoints.length;
                                const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                                const n = dataPoints.length;
                                const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
                                const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
                                const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
                                const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
                                const sxx = sumXX - (sumX * sumX) / n;
                                const scp = sumXY - (sumX * sumY) / n;
                                const slope = scp / sxx;
                                const intercept = meanY - slope * meanX;
                                const yPredicted = slope * point.x + intercept;
                                const residual = point.y - yPredicted;
                                return sum + residual * residual;
                              }, 0)
                              .toFixed(4)}`} />
                          </td>
                          <td className={`col-r2 ${highlightType === 'sstot' ? 'highlight-sstot' : ''}`}>
                            <InlineMath math={`SS_{tot} = ${dataPoints
                              .reduce((sum, point) => {
                                const meanY = dataPoints.reduce((s, p) => s + p.y, 0) / dataPoints.length;
                                const yDiff = point.y - meanY;
                                return sum + yDiff * yDiff;
                              }, 0)
                              .toFixed(4)}`} />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="calculations-panel">
          <div className="calculations-header">
            <h3>Regression Calculations</h3>
            <button 
              className="collapse-button"
              onClick={() => setCalculationsCollapsed(!calculationsCollapsed)}
            >
              {calculationsCollapsed ? '▶' : '▼'}
            </button>
          </div>
          
          {!calculationsCollapsed && (
            <RegressionCalculations 
              data={dataPoints} 
              onHighlight={handleHighlight}
              highlightType={highlightType}
            />
          )}
        </div>
      </div>
      
      <GemmaChatbot dataPoints={dataPoints} />
    </div>
  );
}
