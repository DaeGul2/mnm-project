// src/components/materials/BarChartViz.js

import React from 'react';
import { RechartsComponents, COLORS, getNestedData } from './SharedStyles';

const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = RechartsComponents;

/**
 * BarChartViz 컴포넌트: Recharts를 사용하여 막대 그래프를 렌더링합니다.
 *
 * @param {object} props
 * @param {object} props.calcData - 전체 Step6 계산 결과 (calc.stats)
 * @param {string} props.dataKey - calcData 내부에서 그래프 데이터의 경로 (예: 'perGroup.경영기획.phaseTotalAvgData')
 * @param {string} [props.dataName='avg'] - 그래프에서 사용할 값의 키
 * @param {string} [props.dataLabel='phase'] - X축 레이블로 사용할 키
 */
export default function BarChartViz({ calcData, dataKey, dataName = 'avg', dataLabel = 'phase' }) {
  const data = getNestedData(calcData, dataKey) || [];

  if (data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: COLORS.secondary }}>
        데이터 경로 ({dataKey})에서 유효한 그래프 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataLabel} style={{ fontSize: '10px' }} />
          <YAxis style={{ fontSize: '10px' }} />
          <Tooltip 
            formatter={(value) => value.toFixed(2)}
            contentStyle={{ fontSize: '11px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Bar 
            dataKey={dataName} 
            name="평균 점수" 
            fill={COLORS.primary} 
            fillOpacity={0.9}
            barSize={30}
          >
            {/* 데이터 값 레이블 표시 (선택적) */}
            {/* <RechartsComponents.LabelList dataKey={dataName} position="top" formatter={(val) => val.toFixed(1)} style={{ fontSize: 10 }} /> */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}