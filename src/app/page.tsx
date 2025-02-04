"use client"

import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ViewComponent from '@/components/view-tab/ViewComponent';
import EngineerView from '@/components/view-tab/EngineerView';
import CreateForms from '@/components/create-tab/CreateForms';
import { EngineerData } from '@/types';

const BACKEND_URL = 'https://planner-backend-fz01.onrender.com';

// Add interfaces for better type safety
interface Period {
  period_id: number;
  name: string;
}

interface Skill {
  skill_id: number;
  name: string;
}

// Define the ProjectData interface
interface ProjectData {
  projects: Array<{
    project_id: number;
    project_name: string;
    components: Array<{
      component_id: string;
      component_name: string;
      skill_id: string;
      contributor_id: string | null;
      contributor_name: string | null;
      estimated_weeks: number;
      assigned_weeks: number;
      assignments: boolean[];
    }>;
  }>;
}

const App = () => {
  const [formType, setFormType] = useState('period');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    period: { startDate: '', endDate: '', name: '' },
    project: { 
      name: '', 
      description: '', 
      periodId: '', 
      components: [] as Array<{ skillId: string, estimatedWeeks: string }>
    },
    contributor: { firstName: '', lastName: '', skillIds: [] as number[] }
  });
  const [activeTab, setActiveTab] = useState('form');
  const [activeViewTab, setActiveViewTab] = useState('projects');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Initialize with empty arrays
  const [projectData, setProjectData] = useState<ProjectData>({ projects: [] });
  const [engineerData, setEngineerData] = useState<EngineerData>({});

  // Load initial values from localStorage on mount
  useEffect(() => {
    const savedFormType = localStorage.getItem('formType');
    const savedActiveTab = localStorage.getItem('activeTab');
    const savedActiveViewTab = localStorage.getItem('activeViewTab');
    
    if (savedFormType) {
      setFormType(savedFormType);
    }
    if (savedActiveTab) {
      setActiveTab(savedActiveTab);
    }
    if (savedActiveViewTab) {
      setActiveViewTab(savedActiveViewTab);
    }
  }, []);

  // Save values to localStorage when they change
  useEffect(() => {
    localStorage.setItem('formType', formType);
  }, [formType]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('activeViewTab', activeViewTab);
  }, [activeViewTab]);

  useEffect(() => {
    setSuccessMessage('');
    setError(null);
  }, [formType]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/skills`);
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        setSkills(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/periods`);
        if (!response.ok) throw new Error('Failed to fetch periods');
        const data = await response.json();
        setPeriods(data);
        
        // Get saved period from localStorage or use first period
        const savedPeriod = localStorage.getItem('selectedPeriod');
        if (savedPeriod && data.some((p: { period_id: number }) => p.period_id.toString() === savedPeriod)) {
          setSelectedPeriod(savedPeriod);
        } else if (data.length > 0) {
          setSelectedPeriod(data[0].period_id.toString());
          localStorage.setItem('selectedPeriod', data[0].period_id.toString());
        } else {
          setSelectedPeriod(null);
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
        setError('Failed to load periods');
      } finally {
        setLoading(false);
      }
    };

    fetchPeriods();
  }, []);

  // Save selected period to localStorage when it changes
  useEffect(() => {
    if (selectedPeriod) {
      localStorage.setItem('selectedPeriod', selectedPeriod);
    }
  }, [selectedPeriod]);

  // Fetch data when period changes or component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedPeriod) return;
      
      try {
        setLoading(true);
        const [projectsResponse, engineersResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`),
          fetch(`${BACKEND_URL}/period/${selectedPeriod}/contributor_chart`)
        ]);

        if (!projectsResponse.ok) throw new Error('Failed to fetch projects');
        if (!engineersResponse.ok) throw new Error('Failed to fetch engineers');
        
        const [projectsData, engineersData] = await Promise.all([
          projectsResponse.json(),
          engineersResponse.json()
        ]);
        
        setProjectData(projectsData);
        setEngineerData(engineersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  const handleSubmit = async (e: React.FormEvent<Element>) => {
    e.preventDefault();
    setSuccessMessage('');
    setError(null);
    try {
      if (formType === 'period') {
        const response = await fetch(`${BACKEND_URL}/period`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.period.name,
            start_date: formData.period.startDate,
            end_date: formData.period.endDate
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create period');
        }

        setSuccessMessage('Period created successfully!');
        setFormData({
          ...formData,
          period: { startDate: '', endDate: '', name: '' }
        });
      } else if (formType === 'project') {
        const response = await fetch(`${BACKEND_URL}/project`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.project.name,
            description: formData.project.description,
            period_id: formData.project.periodId,
            components: formData.project.components.map(comp => ({
              skill_id: comp.skillId,
              estimated_weeks: parseInt(comp.estimatedWeeks)
            }))
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        setSuccessMessage('Project created successfully!');
        setFormData({
          ...formData,
          project: { 
            name: '', 
            description: '', 
            periodId: '', 
            components: [] 
          }
        });
      } else if (formType === 'contributor') {
        const response = await fetch(`${BACKEND_URL}/contributor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: formData.contributor.firstName,
            last_name: formData.contributor.lastName,
            skill_ids: formData.contributor.skillIds
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create contributor');
        }

        setSuccessMessage('Contributor created successfully!');
        setFormData({
          ...formData,
          contributor: { firstName: '', lastName: '', skillIds: [] }
        });
      }
    } catch (error: unknown) {
      console.error('Error creating resource:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setSuccessMessage('');
    }
  };

  const renderForm = () => {
    switch(formType) {
      case 'period':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="flex mt-1">
                <Input
                  id="startDate"
                  type="date"
                  value={formData.period.startDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    period: {...formData.period, startDate: e.target.value}
                  })}
                />
                <Calendar className="ml-2 h-5 w-5 text-gray-500" />
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="endDate">End Date</Label>
              <div className="flex mt-1">
                <Input
                  id="endDate"
                  type="date"
                  value={formData.period.endDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    period: {...formData.period, endDate: e.target.value}
                  })}
                />
                <Calendar className="ml-2 h-5 w-5 text-gray-500" />
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="periodName">Period Name</Label>
              <Input
                id="periodName"
                value={formData.period.name}
                onChange={(e) => setFormData({
                  ...formData,
                  period: {...formData.period, name: e.target.value}
                })}
              />
            </div>
          </>
        );

      case 'project':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={formData.project.name}
                onChange={(e) => setFormData({
                  ...formData,
                  project: {...formData.project, name: e.target.value}
                })}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="periodSelect">Select Period</Label>
              <Select
                value={formData.project.periodId}
                onValueChange={(value: string) => setFormData({
                  ...formData,
                  project: {...formData.project, periodId: value}
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(period => (
                    <SelectItem key={period.period_id} value={String(period.period_id)}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <Label>Components</Label>
              <div className="space-y-2 mt-2">
                {formData.project.components.map((component, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Select
                      value={component.skillId}
                      onValueChange={(value) => {
                        const newComponents = [...formData.project.components];
                        newComponents[index].skillId = value;
                        setFormData({
                          ...formData,
                          project: {...formData.project, components: newComponents}
                        });
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {skills.map(skill => (
                          <SelectItem key={skill.skill_id} value={String(skill.skill_id)}>
                            {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Weeks"
                      className="w-[100px]"
                      value={component.estimatedWeeks}
                      onChange={(e) => {
                        const newComponents = [...formData.project.components];
                        newComponents[index].estimatedWeeks = e.target.value;
                        setFormData({
                          ...formData,
                          project: {...formData.project, components: newComponents}
                        });
                      }}
                    />

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        const newComponents = formData.project.components.filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          project: {...formData.project, components: newComponents}
                        });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      project: {
                        ...formData.project,
                        components: [
                          ...formData.project.components,
                          { skillId: '', estimatedWeeks: '' }
                        ]
                      }
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Component
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="description" className="flex items-center">
                Description <span className="text-sm text-gray-500 ml-2">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.project.description}
                onChange={(e) => setFormData({
                  ...formData,
                  project: {...formData.project, description: e.target.value}
                })}
                placeholder="Add project description..."
              />
            </div>
          </>
        );

      case 'contributor':
        return (
          <>
            <div className="mb-4">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.contributor.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                  ...formData,
                  contributor: {...formData.contributor, firstName: e.target.value}
                })}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.contributor.lastName}
                onChange={(e) => setFormData({
                  ...formData,
                  contributor: {...formData.contributor, lastName: e.target.value}
                })}
              />
            </div>
            <div className="mb-4">
              <Label>Skills</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {skills.map(skill => (
                  <label key={skill.skill_id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.contributor.skillIds.includes(skill.skill_id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const updatedSkills = e.target.checked
                          ? [...formData.contributor.skillIds, skill.skill_id]
                          : formData.contributor.skillIds.filter(id => id !== skill.skill_id);
                        setFormData({
                          ...formData,
                          contributor: {...formData.contributor, skillIds: updatedSkills}
                        });
                      }}
                    />
                    <span>{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        );
    }
  };

  // Define the correct dates
  const dateHeaders = [
    '2/3', '2/10', '2/17', '2/24', '3/3', '3/10', '3/17', '3/24', '3/31', '4/7', '4/14', '4/21', '4/28'
  ];

  if (loading && formType === 'contributor') {
    return <div className="flex justify-center items-center min-h-screen">Loading skills...</div>;
  }

  if (error && formType === 'contributor') {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className={`mx-auto mb-4 ${activeTab === 'view' ? 'max-w-[95vw]' : 'max-w-2xl'}`}>
        <div className="flex space-x-2 mb-4">
          <Button 
            variant={activeTab === 'form' ? 'default' : 'outline'}
            onClick={() => setActiveTab('form')}
          >
            Create New
          </Button>
          <Button 
            variant={activeTab === 'view' ? 'default' : 'outline'}
            onClick={() => setActiveTab('view')}
          >
            View All
          </Button>
        </div>

        {activeTab === 'form' ? (
          <CreateForms
            formType={formType}
            setFormType={setFormType}
            handleSubmit={handleSubmit}
            successMessage={successMessage}
            error={error}
          >
            {renderForm()}
          </CreateForms>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="space-x-1 flex">
                  <div 
                    className={`px-4 py-2 cursor-pointer rounded-t-lg ${
                      activeViewTab === 'projects' 
                        ? 'bg-white text-black border-b-2 border-black' 
                        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveViewTab('projects')}
                  >
                    Project View
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer rounded-t-lg ${
                      activeViewTab === 'engineers' 
                        ? 'bg-white text-black border-b-2 border-black' 
                        : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveViewTab('engineers')}
                  >
                    Engineer View
                  </div>
                </div>
                <div className="w-[200px]">
                  <Select
                    value={selectedPeriod || undefined}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map(period => (
                        <SelectItem key={period.period_id} value={period.period_id.toString()}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeViewTab === 'projects' ? (
                <ViewComponent 
                  selectedPeriod={selectedPeriod}
                  projectData={projectData}
                  setProjectData={setProjectData}
                  dateHeaders={dateHeaders}
                />
              ) : (
                <EngineerView 
                  periodId={selectedPeriod} 
                  engineerData={engineerData}
                  setEngineerData={setEngineerData}
                  dateHeaders={dateHeaders}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;