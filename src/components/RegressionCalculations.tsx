import React from 'react';
import regression from 'regression';
import { InlineMath } from 'react-katex';

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionCalculationsProps {
  data: DataPoint[];
  onHighlight: (type: 'scp' | 'sxx' | 'ssres' | 'sstot' | 'slope' | 'intercept' | null) => void;
  highlightType: 'scp' | 'sxx' | 'ssres' | 'sstot' | 'slope' | 'intercept' | null;
  showSlopeCalculation: boolean;
  showInterceptCalculation: boolean;
  showR2Calculation: boolean;
  onCalculationToggle: (type: 'slope' | 'intercept' | 'r2') => void;
}

export const RegressionCalculations: React.FC<RegressionCalculationsProps> = ({ 
  data, 
  onHighlight, 
  highlightType, 
  showSlopeCalculation, 
  showInterceptCalculation, 
  showR2Calculation, 
  onCalculationToggle 
}) => {
  const calculateStats = () => {
    if (data.length < 2) return null;

    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + point.x * point.y, 0);
    const sumXX = data.reduce((acc, point) => acc + point.x * point.x, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    const sxx = sumXX - (sumX * sumX) / n;
    const scp = sumXY - (sumX * sumY) / n;
    const slope = scp / sxx;
    const intercept = meanY - slope * meanX;

    // Calculate R²
    const points: [number, number][] = data.map(point => [point.x, point.y]);
    const result = regression.linear(points);
    const r2 = result.r2;

    return {
      sxx,
      scp,
      slope,
      intercept,
      n,
      sumX,
      sumY,
      sumXY,
      meanX,
      meanY,
      r2
    };
  };

  const stats = calculateStats();

  if (!stats) {
    return (
      <div className="regression-calculations">
        <p>Add at least 2 points to see calculations</p>
      </div>
    );
  }

  return (
    <div className="regression-calculations">
      <div className="calculation-box">
        <h4>Regression Equation</h4>
        <div className="equation" style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#2c5282', whiteSpace: 'nowrap' }}>
          y = <span 
            style={{ 
              cursor: 'pointer', 
              padding: '2px 6px', 
              borderRadius: '4px',
              backgroundColor: highlightType === 'slope' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              transition: 'background-color 0.2s ease-in-out',
              display: 'inline-block'
            }}
            onMouseEnter={() => onHighlight('slope')}
            onMouseLeave={() => onHighlight(null)}
            onClick={() => onCalculationToggle('slope')}
            title="Click to show/hide slope calculation details"
          >
            {stats.slope.toFixed(4)}
          </span>x + <span 
            style={{ 
              cursor: 'pointer', 
              padding: '2px 6px', 
              borderRadius: '4px',
              backgroundColor: highlightType === 'intercept' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              transition: 'background-color 0.2s ease-in-out',
              display: 'inline-block'
            }}
            onMouseEnter={() => onHighlight('intercept')}
            onMouseLeave={() => onHighlight(null)}
            onClick={() => onCalculationToggle('intercept')}
            title="Click to show/hide intercept calculation details"
          >
            {stats.intercept.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="calculation-box">
        <h4>Coefficient of Determination (R²)</h4>
        <div className="formula">
          <div className="result r2-result" 
            style={{ 
              marginTop: '1rem', 
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              transition: 'background-color 0.2s ease-in-out'
            }} 
            data-tooltip="R² (R-squared) measures the proportion of variance in the dependent variable that is explained by the independent variable. Values range from 0 to 1, where 1 indicates perfect prediction and 0 indicates no linear relationship. Click to show/hide detailed calculation."
            onClick={() => onCalculationToggle('r2')}
            title="Click to show/hide R² calculation details"
          >
            <InlineMath math={`R^2 = ${stats.r2.toFixed(4)}`} />
          </div>
        </div>
      </div>

      {(showSlopeCalculation || showInterceptCalculation || showR2Calculation) && (
        <div className="calculation-box">
          <h4>
            {showSlopeCalculation && "Slope Calculation (b₁)"}
            {showInterceptCalculation && "Intercept Calculation (b₀)"}
            {showR2Calculation && "R² Calculation Details"}
          </h4>
          <div className="formula">
            {showSlopeCalculation && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <InlineMath math="b_1 = \frac{SCP}{SXX}" />
                </div>
                <div 
                  className={`scp-tooltip ${highlightType === 'scp' ? 'highlight-scp' : ''}`}
                  onMouseEnter={() => onHighlight('scp')}
                  onMouseLeave={() => onHighlight(null)}
                  style={{ cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', marginBottom: '0.5rem' }}
                  data-tooltip="SCP (Sum of Cross Products): measures how x and y variables vary together. Positive = positive correlation, negative = negative correlation."
                >
                  <div><InlineMath math="SCP = \sum(x - \bar{x})(y - \bar{y})" /></div>
                  <div><InlineMath math={`SCP = ${stats.scp.toFixed(4)}`} /></div>
                </div>
                <hr />
                <div 
                  className={`scp-tooltip ${highlightType === 'sxx' ? 'highlight-sxx' : ''}`}
                  onMouseEnter={() => onHighlight('sxx')}
                  onMouseLeave={() => onHighlight(null)}
                  style={{ cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', marginBottom: '0.5rem' }}
                  data-tooltip="SXX (Sum of Squares of X): measures the total variability in the x-values around their mean. Used as the denominator in calculating the regression slope."
                >
                  <div><InlineMath math="SXX = \sum(x - \bar{x})^2" /></div>
                  <div><InlineMath math={`SXX = ${stats.sxx.toFixed(4)}`} /></div>
                </div>
                <hr />
                <div className="result" style={{ marginTop: '1rem' }}>
                  <InlineMath math={`b_1 = ${stats.slope.toFixed(4)}`} />
                </div>
              </>
            )}

            {showInterceptCalculation && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <InlineMath math="b_0 = \bar{y} - b_1\bar{x}" />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <InlineMath math={`b_0 = ${stats.meanY.toFixed(4)} - (${stats.slope.toFixed(4)} \\times ${stats.meanX.toFixed(4)})`} />
                </div>
                <div className="result" style={{ marginTop: '1rem' }}>
                  <InlineMath math={`b_0 = ${stats.intercept.toFixed(4)}`} />
                </div>
              </>
            )}

            {showR2Calculation && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <InlineMath math="R^2 = 1 - \frac{SS_{res}}{SS_{tot}}" />
                </div>
                <div 
                  className={`scp-tooltip ${highlightType === 'ssres' ? 'highlight-ssres' : ''}`}
                  onMouseEnter={() => onHighlight('ssres')}
                  onMouseLeave={() => onHighlight(null)}
                  style={{ cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', marginBottom: '0.5rem' }}
                  data-tooltip="SSres (Residual Sum of Squares): measures the total unexplained variance in the dependent variable. Smaller values indicate better model fit."
                >
                  <InlineMath math="SS_{res} = \sum(y - \hat{y})^2" />
                </div>
                <div 
                  className={`scp-tooltip ${highlightType === 'sstot' ? 'highlight-sstot' : ''}`}
                  onMouseEnter={() => onHighlight('sstot')}
                  onMouseLeave={() => onHighlight(null)}
                  style={{ cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', marginBottom: '0.5rem' }}
                  data-tooltip="SStot (Total Sum of Squares): measures the total variance in the dependent variable around its mean. Used as the baseline for calculating R²."
                >
                  <InlineMath math="SS_{tot} = \sum(y - \bar{y})^2" />
                </div>
                <div className="result" style={{ marginTop: '1rem' }}>
                  <InlineMath math={`R^2 = ${stats.r2.toFixed(4)}`} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
