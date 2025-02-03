import React, { useEffect, useState } from 'react';
import styles from './EngineerView.module.css';

const BACKEND_URL = 'https://planner-backend-fz01.onrender.com';

interface EngineerViewProps {
  periodId: string | null;
}

interface Engineer {
  name: string;
  assignments: string[][];
  avg?: number;
}

interface EngineerData {
  [key: string]: Engineer;
}

const EngineerView: React.FC<EngineerViewProps> = ({ periodId }) => {
  const [engineerData, setEngineerData] = useState<EngineerData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngineerData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/period/${periodId}/contributor_chart`);
        if (!response.ok) {
          throw new Error('Failed to fetch engineer data');
        }
        const data = await response.json();
        setEngineerData(data);
      } catch (error) {
        console.error('Error fetching engineer data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (periodId) {
      fetchEngineerData();
    }
  }, [periodId]);

  if (loading) {
    return <div className="w-full h-full min-h-screen bg-white p-6">Loading...</div>;
  }

  const engineers = Object.values(engineerData).map(engineer => ({
    ...engineer,
    avg: Number((engineer.assignments.reduce((sum, tasks) => sum + tasks.length, 0) / engineer.assignments.length).toFixed(2))
  }));

  const dates = [
    '2/3', '2/10', '2/17', '2/24', '3/3', '3/10', '3/17', '3/24', '3/31', '4/7', '4/14', '4/21'
  ];

  const getCellColor = (value: number): string => {
    if (value === 0) return 'bg-white';
    if (value === 1) return 'bg-green-100';
    if (value === 2) return 'bg-orange-100';
    return 'bg-white';
  };

  const getAvgColor = (value: number): string => {
    if (value < 0.7) return 'bg-red-100';
    if (value < 0.9) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="w-full h-full min-h-screen bg-white p-6">
      <div className={styles.tooltipContainer}>
        <h2 className="text-2xl font-bold mb-6">Engineer Assignments</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-48 sticky left-0 bg-gray-50">Engineer</th>
                {dates.map((date) => (
                  <th key={date} className="text-center py-4 px-2 font-medium text-sm text-gray-500 w-16">
                    {date}
                  </th>
                ))}
                <th className="text-center py-4 px-4 font-medium text-sm text-gray-500 w-20">Avg</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((engineer) => (
                <tr key={engineer.name} className="border-b">
                  <td className="py-4 px-4 font-medium sticky left-0 bg-white">{engineer.name}</td>
                  {engineer.assignments.map((tasks, index) => (
                    <td 
                      key={index} 
                      className={`text-center py-4 px-2 ${getCellColor(tasks.length)}`}
                      data-tooltip={tasks.join('\n')}
                    >
                      {tasks.length}
                    </td>
                  ))}
                  <td className={`text-center py-4 px-4 ${getAvgColor(engineer.avg || 0)}`}>
                    {engineer.avg}
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