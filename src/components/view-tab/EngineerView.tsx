import React, { useEffect, useState } from 'react';

const BACKEND_URL = 'http://127.0.0.1:5000';

const EngineerView = ({ periodId }) => {
  const [engineerData, setEngineerData] = useState({});
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

  const getCellColor = (value) => {
    if (value === 0) return 'bg-white';
    if (value === 1) return 'bg-green-100';
    if (value === 2) return 'bg-orange-100';
    return 'bg-white';
  };

  const getAvgColor = (value) => {
    if (value < 0.7) return 'bg-red-100';
    if (value < 0.9) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="w-full h-full min-h-screen bg-white p-6">
      <style jsx>{`
        [data-tooltip]:hover::before {
          content: attr(data-tooltip);
          position: absolute;
          background: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: pre;
          z-index: 100;
          transform: translateY(-100%);
          margin-top: -8px;
        }
      `}</style>
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
                    className={`text-center py-4 px-2 relative ${getCellColor(tasks.length)}`}
                    {...(tasks.length > 0 ? { 'data-tooltip': tasks.join('\n') } : {})}
                  >
                    {tasks.length}
                  </td>
                ))}
                <td className={`text-center py-4 px-4 font-medium ${getAvgColor(engineer.avg)}`}>
                  {engineer.avg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EngineerView;