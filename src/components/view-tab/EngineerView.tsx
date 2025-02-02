import React from 'react';

const EngineerView = () => {
  const engineers = [
    { name: 'Ala Ibrahim (FE)', assignments: [0,0,1,1,1,1,1,1,1,2,1,1,1], avg: 0.92 },
    { name: 'Anthony Xie (FE)', assignments: [1,1,1,1,1,1,1,1,0,0,0,0,0], avg: 0.62 },
    { name: 'Scott Sarsfield (FE)', assignments: [1,1,1,1,0,0,0,0,1,1,1,1,0], avg: 0.62 },
    { name: 'Valentin Poliakov (BE)', assignments: [1,1,1,1,1,1,1,1,0,1,1,1,1], avg: 0.92 },
    { name: 'Mira Suthakar (BE)', assignments: [1,1,1,1,1,1,1,1,0,0,0,0,0], avg: 0.62 },
    { name: 'Nick Kisel (BE)', assignments: [1,1,2,2,1,1,1,2,1,1,1,1,1], avg: 1.23 },
    { name: 'Joe Schlesinger (BE)', assignments: [1,1,1,1,1,1,1,1,1,2,1,1,1], avg: 1.08 },
    { name: 'Austin Wahle (BE)', assignments: [1,1,1,1,2,2,1,1,1,1,1,1,0], avg: 1.08 },
    { name: 'Ivan Vavilov (iOS)', assignments: [1,1,1,1,1,1,1,1,1,1,1,0,0], avg: 0.85 },
    { name: 'Pavlo Kramchanyov (Android)', assignments: [1,1,1,1,1,1,0,0,0,0,0,0,0], avg: 0.46 }
  ];

  const dates = [
    '2/3', '2/10', '2/17', '2/24', '3/3', '3/10', '3/17', '3/24', '3/31', '4/7', '4/14', '4/21', '4/28'
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
                {engineer.assignments.map((value, index) => (
                  <td key={index} className={`text-center py-4 px-2 ${getCellColor(value)}`}>
                    {value}
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