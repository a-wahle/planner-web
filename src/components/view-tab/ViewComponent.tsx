"use client"

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input";

// Move getStatusColor outside of the component
const getStatusColor = (percentage: number) => {
  if (percentage === 0) return 'bg-red-100 text-red-800';
  if (percentage < 50) return 'bg-orange-100 text-orange-800';
  if (percentage < 100) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

interface ViewComponentProps {
  activeViewTab: string;
  setActiveViewTab: (tab: string) => void;
  selectedPeriod: string | null;
}

const ViewComponent: React.FC<ViewComponentProps> = ({ 
  activeViewTab, 
  setActiveViewTab,
  selectedPeriod 
}) => {
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectData, setProjectData] = useState({ projects: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [contributorsBySkill, setContributorsBySkill] = useState<Record<string, any[]>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, { added: Set<number>, removed: Set<number> }>>({});
  const [newComponent, setNewComponent] = useState<{ 
    skillId: string, 
    estimatedWeeks: string,
    name: string 
  } | null>(null);
  const [skills, setSkills] = useState<Record<string, string>>({});

  // Load periods on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/periods');
        if (!response.ok) {
          throw new Error('Failed to fetch periods');
        }
        const data = await response.json();
        setPeriods(data);
      } catch (err) {
        console.error('Error fetching periods:', err);
        setError('Failed to load periods');
      }
    };

    fetchPeriods();
  }, []);

  // Load expanded projects from localStorage on mount and when projects change
  useEffect(() => {
    const allProjectIds = projectData.projects.map(project => project.project_id);
    
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const savedExpanded = localStorage.getItem('expandedProjects');
      
      if (savedExpanded) {
        try {
          const parsedIds = JSON.parse(savedExpanded);
          // If the saved state is empty, use all project IDs instead
          if (parsedIds.length === 0) {
            setExpandedProjects(new Set(allProjectIds));
            localStorage.setItem('expandedProjects', JSON.stringify(allProjectIds));
          } else {
            setExpandedProjects(new Set(parsedIds));
          }
        } catch (error) {
          console.error('Error loading expanded projects:', error);
          setExpandedProjects(new Set(allProjectIds));
          localStorage.setItem('expandedProjects', JSON.stringify(allProjectIds));
        }
      } else {
        // No saved state, expand all projects
        setExpandedProjects(new Set(allProjectIds));
        localStorage.setItem('expandedProjects', JSON.stringify(allProjectIds));
      }
    } else {
      // Server-side rendering, just set all projects as expanded
      setExpandedProjects(new Set(allProjectIds));
    }
  }, [projectData.projects]);

  // Fetch project data when selected period changes
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!selectedPeriod) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjectData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load projects. Please try again.');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [selectedPeriod]);

  // Fetch contributors when a new skill_id is encountered
  const fetchContributorsForSkill = async (skillId: string) => {
    if (!skillId || contributorsBySkill[skillId]) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/contributors/get_contributors_by_skill/${skillId}`);
      if (!response.ok) throw new Error('Failed to fetch contributors');
      const data = await response.json();
      setContributorsBySkill(prev => ({
        ...prev,
        [skillId]: data.contributors
      }));
    } catch (err) {
      setError('Failed to load contributors');
    }
  };

  // Fetch contributors for all skills in the project data
  useEffect(() => {
    const skillIds = new Set(
      projectData.projects.flatMap(project => 
        project.components.map(component => component.skill_id)
      )
    );
    
    skillIds.forEach(skillId => {
      if (skillId) fetchContributorsForSkill(skillId);
    });
  }, [projectData]);

  // Add new useEffect to fetch skills
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/skills');
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        // Create a mapping of skill_id to skill name
        const skillMap = data.reduce((acc, skill) => ({
          ...acc,
          [skill.skill_id]: skill.name
        }), {});
        setSkills(skillMap);
      } catch (error) {
        console.error('Error fetching skills:', error);
        setError('Failed to load skills');
      }
    };

    fetchSkills();
  }, []);

  const startDate = new Date('2024-02-03');
  const dateHeaders = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 7);
    return `${(date.getMonth() + 1)}/${date.getDate()}`;
  });

  const toggleCell = (componentId: string, weekIndex: number, isAssigned: boolean) => {
    setPendingChanges(prev => {
      // Create a new copy of the component changes or initialize if not exists
      const componentChanges = {
        added: new Set(prev[componentId]?.added || []),
        removed: new Set(prev[componentId]?.removed || [])
      };
      
      if (isAssigned) {
        // Toggle removed status for assigned cells
        if (componentChanges.removed.has(weekIndex)) {
          componentChanges.removed.delete(weekIndex);
        } else {
          componentChanges.removed.add(weekIndex);
        }
      } else {
        // Toggle added status for unassigned cells
        if (componentChanges.added.has(weekIndex)) {
          componentChanges.added.delete(weekIndex);
        } else {
          componentChanges.added.add(weekIndex);
        }
      }

      // If both sets are empty, remove the component from pendingChanges
      if (componentChanges.added.size === 0 && componentChanges.removed.size === 0) {
        const { [componentId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [componentId]: componentChanges
      };
    });
  };

  const submitChanges = async (componentId: string, contributorId: string | null) => {
    if (!contributorId) return;

    try {
      setError(null);
      const changes = pendingChanges[componentId] || { added: new Set(), removed: new Set() };
      
      const response = await fetch('http://127.0.0.1:5000/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component_id: componentId,
          contributor_id: contributorId,
          added_weeks: Array.from(changes.added),
          removed_weeks: Array.from(changes.removed)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignments');
      }

      // Clear pending changes for this component
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[componentId];
        return newChanges;
      });

      // Refresh project data
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (error) {
      console.error('Error updating assignments:', error);
      setError(error.message);
    }
  };

  // Update toggleProject to check for client-side
  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
    
    // Only save to localStorage on client side
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('expandedProjects', JSON.stringify(Array.from(newExpanded)));
      } catch (error) {
        console.error('Error saving expanded projects:', error);
      }
    }
  };

  const isCellSelected = (componentId, weekIndex) => {
    return selectedCells.has(`${componentId}-${weekIndex}`);
  };

  const getProjectSummary = (project) => {
    const componentSummaries = project.components.map(component => {
      const scheduledWeeks = component.assigned_weeks;
      const percentage = (scheduledWeeks / component.estimated_weeks) * 100;
      return {
        name: component.component_name,
        engineer: component.contributor_name,
        scheduledWeeks,
        estimatedWeeks: component.estimated_weeks,
        statusColor: getStatusColor(percentage)
      };
    });

    const totalScheduledWeeks = project.components.reduce((sum, component) => 
      sum + component.assigned_weeks, 0);
    const totalEstimatedWeeks = project.components.reduce((sum, component) => 
      sum + component.estimated_weeks, 0);
    const scheduledPercentage = totalEstimatedWeeks > 0 ? (totalScheduledWeeks / totalEstimatedWeeks) * 100 : 0;

    return {
      componentSummaries,
      totalScheduledWeeks,
      totalEstimatedWeeks,
      statusColor: getStatusColor(scheduledPercentage),
      percentage: scheduledPercentage
    };
  };

  const clearAssignments = async (componentId: string) => {
    try {
      setError(null);
      const response = await fetch(`http://127.0.0.1:5000/component/${componentId}/assignments`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear assignments');
      }

      // Refresh project data after successful deletion
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      setError('Failed to clear assignments. Please try again.');
      console.error('Error clearing assignments:', err);
    }
  };

  const assignContributor = async (componentId: string, contributorId: string) => {
    try {
      setError(null);
      const response = await fetch(`http://127.0.0.1:5000/component/${componentId}/assign_contributor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contributor_id: contributorId === 'unassigned' ? null : contributorId
        }),
      });

      if (!response.ok) throw new Error('Failed to assign contributor');

      // Refresh project data
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) throw new Error('Failed to refresh projects');
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      setError('Failed to assign contributor. Please try again.');
    }
  };

  const deleteComponent = async (componentId: string) => {
    try {
      setError(null);
      const response = await fetch(`http://127.0.0.1:5000/component/${componentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete component');
      }

      // Refresh project data after successful deletion
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      setError('Failed to delete component. Please try again.');
      console.error('Error deleting component:', err);
    }
  };

  // Update the deleteProject function
  const deleteProject = async (projectId: string) => {
    try {
      setError(null);
      const response = await fetch(`http://127.0.0.1:5000/project/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Refresh project data after successful deletion
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project. Please try again.');
    }
  };

  const addComponent = async (projectId: string) => {
    try {
      if (!newComponent?.skillId || !newComponent?.estimatedWeeks) {
        setError('Please fill in all component fields');
        return;
      }

      setError(null);
      const response = await fetch('http://127.0.0.1:5000/component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newComponent.name,
          description: '',
          project_id: projectId,
          skill_id: newComponent.skillId,
          estimated_weeks: parseInt(newComponent.estimatedWeeks)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add component');
      }

      // Reset form
      setNewComponent(null);

      // Refresh project data
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      console.error('Error adding component:', err);
      setError('Failed to add component. Please try again.');
    }
  };

  // Add new function to handle estimated weeks update
  const updateEstimatedWeeks = async (componentId: string, weeks: number) => {
    try {
      setError(null);
      const response = await fetch(`http://127.0.0.1:5000/component/${componentId}/estimated_weeks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimated_weeks: weeks
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update estimated weeks');
      }

      // Refresh project data
      const refreshResponse = await fetch(`http://127.0.0.1:5000/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      console.error('Error updating estimated weeks:', err);
      setError('Failed to update estimated weeks. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading projects...</div>;
  }

  return (
    <div className="w-full h-full min-h-screen bg-white">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-64 sticky left-0 bg-gray-50">Project / Component</th>
              {expandedProjects.size > 0 && (
                <>
                  <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-20">Weeks</th>
                  <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-48">Engineer</th>
                  {dateHeaders.map((date, index) => (
                    <th key={index} className="text-center py-4 px-2 font-medium text-sm text-gray-500 w-16">
                      {date}
                    </th>
                  ))}
                  <th className="text-center py-4 px-4 font-medium text-sm text-gray-500 w-32">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {projectData.projects.map((project) => {
              const summary = getProjectSummary(project);
              const isExpanded = expandedProjects.has(project.project_id);
              
              return (
                <React.Fragment key={project.project_id}>
                  <tr 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleProject(project.project_id)}
                  >
                    {!isExpanded ? (
                      <td className="py-4 px-4 sticky left-0 bg-white" colSpan={15}>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center font-medium min-w-64">
                            <ChevronRight className="w-4 h-4 mr-2" />
                            {project.project_name}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-2 hover:bg-gray-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent 
                                className="w-40 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteProject(String(project.project_id))}
                                  className="w-full justify-start px-3 py-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex gap-4">
                            {summary.componentSummaries.map((component, index) => (
                              <div 
                                key={index} 
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${component.statusColor}`}
                              >
                                <span className="font-medium">{component.name}</span>
                                <span className="text-gray-600">•</span>
                                <span>{component.engineer}</span>
                                <span className="text-gray-600">•</span>
                                <span>{component.scheduledWeeks}/{component.estimatedWeeks}w</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-4 px-4 font-medium sticky left-0 bg-white flex items-center">
                          <ChevronDown className="w-4 h-4 mr-2" />
                          {project.project_name}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="ml-2 hover:bg-gray-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-40 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteProject(String(project.project_id))}
                                className="w-full justify-start px-3 py-2 text-red-600 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td colSpan={14}></td>
                      </>
                    )}
                  </tr>
                  {isExpanded && (
                    <>
                      {project.components.map((component) => (
                        <tr key={component.component_id} className="border-b hover:bg-gray-50 bg-gray-50/50">
                          <td className="py-4 px-4 pl-10 sticky left-0 bg-gray-50/50">
                            {component.component_name}
                          </td>
                          <td className="py-4 px-4">
                            <Input
                              type="number"
                              min="1"
                              value={component.estimated_weeks}
                              className="w-20"
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value);
                                if (newValue > 0) {
                                  updateEstimatedWeeks(component.component_id, newValue);
                                }
                              }}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Select
                                value={component.contributor_id || "unassigned"}
                                onValueChange={(value) => assignContributor(component.component_id, value)}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {component.skill_id && contributorsBySkill[component.skill_id]?.map((contributor) => (
                                    <SelectItem 
                                      key={contributor.contributor_id} 
                                      value={contributor.contributor_id.toString()}
                                    >
                                      {`${contributor.first_name} ${contributor.last_name}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {component.contributor_id && (
                                pendingChanges[component.component_id] && 
                                (pendingChanges[component.component_id].added.size > 0 || 
                                 pendingChanges[component.component_id].removed.size > 0) ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => submitChanges(component.component_id, component.contributor_id)}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-0 h-auto font-normal"
                                  >
                                    Submit
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearAssignments(component.component_id);
                                    }}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 p-0 h-auto font-normal"
                                  >
                                    Clear
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                          {component.assignments.map((assigned, weekIndex) => (
                            <td 
                              key={weekIndex} 
                              className={`text-center p-0 cursor-pointer border border-gray-100 ${
                                pendingChanges[component.component_id]?.added.has(weekIndex) ? 'bg-blue-200' :
                                pendingChanges[component.component_id]?.removed.has(weekIndex) ? 'bg-red-200' :
                                assigned ? 'bg-green-500' : ''
                              }`}
                              onClick={() => toggleCell(component.component_id, weekIndex, assigned)}
                            >
                              <div className="w-full h-full p-4 hover:bg-gray-100">
                              </div>
                            </td>
                          ))}
                          <td className="text-center py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              component.assigned_weeks >= component.estimated_weeks
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {component.assigned_weeks >= component.estimated_weeks ? 'Scheduled' : 'Unassigned'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteComponent(component.component_id)}
                              className="hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b">
                        <td colSpan={15} className="py-2 px-4">
                          {newComponent ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Component name"
                                className="w-[300px]"
                                value={newComponent.name}
                                onChange={(e) => setNewComponent({
                                  ...newComponent,
                                  name: e.target.value
                                })}
                              />
                              <Select
                                value={newComponent.skillId}
                                onValueChange={(value) => {
                                  const defaultName = `${project.project_name} ${skills[value]}`;
                                  setNewComponent({
                                    ...newComponent,
                                    skillId: value,
                                    name: defaultName
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select skill" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(skills).map(([skillId, skillName]) => (
                                    <SelectItem key={skillId} value={skillId}>
                                      {skillName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Input
                                type="number"
                                placeholder="Weeks"
                                className="w-[100px]"
                                value={newComponent.estimatedWeeks}
                                onChange={(e) => setNewComponent({
                                  ...newComponent,
                                  estimatedWeeks: e.target.value
                                })}
                              />

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => addComponent(String(project.project_id))}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                Add
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setNewComponent(null)}
                                className="text-gray-500"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewComponent({ 
                                skillId: '', 
                                estimatedWeeks: '',
                                name: '' 
                              })}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Component
                            </Button>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewComponent;