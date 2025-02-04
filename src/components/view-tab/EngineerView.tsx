import React, { useEffect, useState } from 'react';
import styles from './EngineerView.module.css';
import { EngineerData } from '@/types';

const BACKEND_URL = 'https://planner-backend-fz01.onrender.com';

interface EngineerViewProps {
  periodId: string | null;
  engineerData: EngineerData;
  setEngineerData: React.Dispatch<React.SetStateAction<EngineerData>>;
  dateHeaders: string[];
}

const EngineerView: React.FC<EngineerViewProps> = ({ 
  periodId,
  engineerData = {},
  setEngineerData,
  dateHeaders
}) => {
  const [loading, setLoading] = useState(true);

  const getAvgColor = (value: number): string => {
    if (value < 0.7) return 'bg-red-100';
    if (value < 0.9) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  useEffect(() => {
    const fetchEngineerData = async () => {
      if (!periodId) return;
      
      try {
        const response = await fetch(`${BACKEND_URL}/period/${periodId}/contributor_chart`);
        if (!response.ok) {
          throw new Error('Failed to fetch engineer data');
        }
        const data = await response.json();
        setEngineerData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching engineer data:', error);
        setLoading(false);
      }
    };

    fetchEngineerData();
  }, [periodId, setEngineerData]);

  if (loading) {
    return <div className="w-full h-full min-h-screen bg-white p-6">Loading...</div>;
  }

  const engineers = Object.entries(engineerData).map(([id, engineer]) => ({
    id,
    name: engineer.name,
    assignments: dateHeaders.map((_, weekIndex) => {
      return engineer.assignments[weekIndex] || [];
    }),
    avg: engineer.assignments.reduce((sum, weekAssignments) => 
      sum + (weekAssignments.length > 0 ? 1 : 0), 0) / dateHeaders.length
  }));

  return (
    <div className="w-full h-full min-h-screen bg-white p-6">
      <div className={styles.tooltipContainer}>
        <h2 className="text-2xl font-bold mb-6">Engineer Assignments</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-48 sticky left-0 bg-gray-50">
                  Engineer
                </th>
                {dateHeaders.map((date) => (
                  <th key={date} className="text-center py-4 px-2 font-medium text-sm text-gray-500 w-16">
                    {date}
                  </th>
                ))}
                <th className="text-center py-4 px-4 font-medium text-sm text-gray-500 w-20">Avg</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((engineer) => (
                <tr key={engineer.id} className="border-b">
                  <td className="py-4 px-4 font-medium sticky left-0 bg-white">{engineer.name}</td>
                  {engineer.assignments.map((tasks, index) => (
                    <td 
                      key={index} 
                      className={`text-center py-4 px-2 border border-gray-200 ${
                        tasks.length === 0 ? 'bg-white' :
                        tasks.length === 1 ? 'bg-green-100' :
                        'bg-orange-100'
                      }`}
                      data-tooltip={tasks.join('\n')}
                    >
                      <div className="w-full h-6 flex items-center justify-center">
                        {tasks.length > 0 && tasks.length}
                      </div>
                    </td>
                  ))}
                  <td className={`text-center py-4 px-4 ${getAvgColor(engineer.avg)}`}>
                    {engineer.avg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EngineerView;