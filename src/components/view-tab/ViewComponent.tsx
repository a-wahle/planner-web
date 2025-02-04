"use client"

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, MoreVertical, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const BACKEND_URL = 'https://planner-backend-fz01.onrender.com';

// Move getStatusColor outside of the component
const getStatusColor = (percentage: number) => {
  if (percentage === 0) return 'bg-red-100 text-red-800';
  if (percentage < 50) return 'bg-orange-100 text-orange-800';
  if (percentage < 100) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

interface Project {
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
}

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

interface ViewComponentProps {
  selectedPeriod: string | null;
  projectData: ProjectData;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData>>;
  dateHeaders: string[];
}

// Define a type for the contributor skill mapping
type ContributorSkillMap = Record<string, Array<{
  contributor_id: number;
  first_name: string;
  last_name: string;
}>>;

// Add new interface for skill data
interface SkillData {
  skill_id: string;
  name: string;
}

// Add type for skill map
type SkillMap = Record<string, string>;

/* eslint-disable @typescript-eslint/no-unused-vars */
const ViewComponent: React.FC<ViewComponentProps> = ({ 
  selectedPeriod, 
  projectData = { projects: [] },
  setProjectData,
  dateHeaders
}): React.ReactElement => {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contributorsBySkill, setContributorsBySkill] = useState<ContributorSkillMap>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, { added: Set<number>, removed: Set<number> }>>({});
  const [newComponent, setNewComponent] = useState<{ 
    projectId: string | null,
    skillId: string, 
    estimatedWeeks: string,
    name: string 
  } | null>(null);
  const [skills, setSkills] = useState<Record<string, string>>({});

  // Load periods on mount
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/periods`);
        if (!response.ok) {
          throw new Error('Failed to fetch periods');
        }
        await response.json();
      } catch (error) {
        console.error('Error fetching periods:', error);
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
    const fetchSkills = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/skills`, {
          headers: {
            'accept': '*/*',
            'origin': window.location.origin,
            'referer': window.location.href,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data = await response.json();
        // Create a mapping of skill_id to skill name
        const skillMap = data.reduce((acc: SkillMap, skill: SkillData) => ({
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

  // Use the makeRequest helper for other API calls
  const makeRequest = async (url: string, options: RequestInit = {}) => {
    const defaultHeaders = {
      'accept': '*/*',
      'origin': window.location.origin,
      'referer': window.location.href,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  };

  // Fetch contributors when a new skill_id is encountered
  const fetchContributorsForSkill = React.useCallback(async (skillId: string) => {
    if (!skillId || contributorsBySkill[skillId]) return;

    try {
      const response = await fetch(`${BACKEND_URL}/contributors/get_contributors_by_skill/${skillId}`);
      if (!response.ok) throw new Error('Failed to fetch contributors');
      const data = await response.json();
      setContributorsBySkill(prev => ({
        ...prev,
        [skillId]: data.contributors
      }));
    } catch (error) {
      console.error('Error fetching contributors:', error);
      setError('Failed to load contributors');
    }
  }, [contributorsBySkill]);

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
  }, [projectData, fetchContributorsForSkill]);

  const toggleCell = (componentId: string, weekIndex: number, isAssigned: boolean) => {
    setPendingChanges(prev => {
      const componentChanges = prev[componentId] || { added: new Set(), removed: new Set() };
      const newChanges = {
        added: new Set(componentChanges.added),
        removed: new Set(componentChanges.removed)
      };
      
      if (isAssigned) {
        // If it's currently assigned (green)
        if (newChanges.removed.has(weekIndex)) {
          // If it's already marked for removal (red), unmark it (back to green)
          newChanges.removed.delete(weekIndex);
        } else {
          // Mark it for removal (red)
          newChanges.removed.add(weekIndex);
          // Ensure it's not in added set
          newChanges.added.delete(weekIndex);
        }
      } else {
        // If it's unassigned (grey)
        if (newChanges.added.has(weekIndex)) {
          // If it's already marked for addition (blue), unmark it (back to grey)
          newChanges.added.delete(weekIndex);
        } else {
          // Mark it for addition (blue)
          newChanges.added.add(weekIndex);
          // Ensure it's not in removed set
          newChanges.removed.delete(weekIndex);
        }
      }

      // If no pending changes, remove the component from pendingChanges
      if (newChanges.added.size === 0 && newChanges.removed.size === 0) {
        const { [componentId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [componentId]: newChanges
      };
    });
  };

  const submitChanges = async (componentId: string, contributorId: string | null) => {
    if (!contributorId) return;

    try {
      setError(null);
      const changes = pendingChanges[componentId] || { added: new Set(), removed: new Set() };
      
      // Optimistically update the UI
      setProjectData((prevData: ProjectData): ProjectData => {
        const newData: ProjectData = { ...prevData };
        const project = newData.projects.find(p => 
          p.components.some(c => c.component_id === componentId)
        );
        
        if (project) {
          const component = project.components.find(c => c.component_id === componentId);
          if (component) {
            // Create a new assignments array with the changes applied
            const newAssignments = [...component.assignments];
            changes.added.forEach(weekIndex => {
              newAssignments[weekIndex] = true;
            });
            changes.removed.forEach(weekIndex => {
              newAssignments[weekIndex] = false;
            });
            
            // Update the assigned_weeks count
            component.assigned_weeks = newAssignments.filter(Boolean).length;
            component.assignments = newAssignments;
          }
        }
        
        return newData;
      });

      // Clear pending changes immediately
      setPendingChanges(prev => {
        const { [componentId]: _, ...rest } = prev;
        return rest;
      });

      const response = await fetch(`${BACKEND_URL}/assignment`, {
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

      // Still fetch fresh data to ensure consistency
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (error: unknown) {
      console.error('Error updating assignments:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Revert the optimistic update if there's an error
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setProjectData(data);
      }
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

  const getProjectSummary = (project: Project) => {
    const componentSummaries = project.components.map(component => {
      const scheduledWeeks = component.assigned_weeks;
      const percentage = (scheduledWeeks / component.estimated_weeks) * 100;
      return {
        name: skills[component.skill_id] || 'Unknown Skill',
        engineer: component.contributor_name,
        scheduledWeeks,
        estimatedWeeks: component.estimated_weeks,
        statusColor: getStatusColor(percentage)
      };
    });

    const totalScheduledWeeks = project.components.reduce((acc: number, component) => 
      acc + component.assigned_weeks, 0);
    const totalEstimatedWeeks = project.components.reduce((acc: number, component) => 
      acc + component.estimated_weeks, 0);
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
      const response = await fetch(`${BACKEND_URL}/component/${componentId}/assignments`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear assignments');
      }

      // Refresh project data after successful deletion
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (error: unknown) {
      setError('Failed to clear assignments. Please try again.');
      console.error('Error clearing assignments:', error);
    }
  };

  const assignContributor = async (componentId: string, contributorId: string) => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/component/${componentId}/assign_contributor`, {
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
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) throw new Error('Failed to refresh projects');
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (err) {
      console.error('Error assigning contributor:', err);
      setError('Failed to assign contributor. Please try again.');
    }
  };

  const deleteComponent = async (componentId: string) => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/component/${componentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete component');
      }

      // Refresh project data after successful deletion
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshResponse.json();
      setProjectData(data);
    } catch (error: unknown) {
      setError('Failed to delete component. Please try again.');
      console.error('Error deleting component:', error);
    }
  };

  // Update the deleteProject function
  const deleteProject = async (projectId: string) => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/project/${projectId}`, {
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
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
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
      const response = await fetch(`${BACKEND_URL}/component`, {
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
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
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
      const response = await fetch(`${BACKEND_URL}/component/${componentId}/estimated_weeks`, {
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
      const refreshResponse = await fetch(`${BACKEND_URL}/period/${selectedPeriod}/projects`);
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
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <div className="w-full h-full min-h-screen bg-white">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {loading && (
        <div className="absolute top-4 right-4 text-sm text-gray-500">
          Refreshing...
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-4 px-4 font-medium text-sm text-gray-500 w-64 sticky left-0 bg-gray-50">
                Project / Component
              </th>
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
                  <th className="w-10"></th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {projectData.projects.map((project) => {
              const isExpanded = expandedProjects.has(project.project_id);
              const summary = getProjectSummary(project);
              
              return (
                <React.Fragment key={project.project_id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4 sticky left-0 bg-white" colSpan={expandedProjects.size > 0 ? dateHeaders.length + 4 : 1}>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center font-medium w-128">
                          <div 
                            className="flex items-center cursor-pointer"
                            onClick={() => toggleProject(project.project_id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 mr-2" />
                            ) : (
                              <ChevronRight className="w-4 h-4 mr-2" />
                            )}
                            <span className="truncate">{project.project_name}</span>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button 
                                className="ml-2 p-1 hover:bg-gray-100 rounded"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => setNewComponent({
                                  projectId: project.project_id.toString(),
                                  name: '',
                                  skillId: '',
                                  estimatedWeeks: ''
                                })}
                              >
                                <Plus className="w-4 h-4" />
                                Add Component
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                                onClick={() => deleteProject(project.project_id.toString())}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Project
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {!isExpanded && (
                          <div className="flex gap-4 text-sm">
                            {summary.componentSummaries.map((compSummary, index) => (
                              <div key={index} className={`px-2 py-1 rounded ${compSummary.statusColor}`}>
                                {compSummary.name} • {compSummary.engineer || 'Unassigned'} • {compSummary.scheduledWeeks}/{compSummary.estimatedWeeks}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && project.components.map((component) => (
                    <tr key={component.component_id} className="border-b">
                      <td className="py-4 px-4 pl-12 sticky left-0 bg-white">
                        {component.component_name}
                      </td>
                      {expandedProjects.size > 0 && (
                        <>
                          <td className="text-center py-4 px-4">
                            <input
                              type="number"
                              className="w-16 px-2 py-1 border rounded text-center"
                              value={component.estimated_weeks}
                              onChange={(e) => updateEstimatedWeeks(component.component_id, parseInt(e.target.value))}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                className="px-2 py-1 border rounded min-w-[150px]"
                                value={component.contributor_id || 'unassigned'}
                                onChange={(e) => assignContributor(component.component_id, e.target.value)}
                              >
                                <option value="unassigned">Unassigned</option>
                                {contributorsBySkill[component.skill_id]?.map((contributor) => (
                                  <option key={contributor.contributor_id} value={contributor.contributor_id}>
                                    {contributor.first_name} {contributor.last_name}
                                  </option>
                                ))}
                              </select>
                              <div className="w-[80px]">
                                {component.contributor_id && (
                                  pendingChanges[component.component_id] ? (
                                    <button
                                      onClick={() => submitChanges(component.component_id, component.contributor_id)}
                                      className="px-2 py-1 bg-blue-500 text-white rounded text-sm w-full"
                                    >
                                      Submit
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => clearAssignments(component.component_id)}
                                      className="px-2 py-1 bg-white text-blue-500 border border-blue-500 rounded text-sm w-full hover:bg-blue-50"
                                    >
                                      Clear
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </td>
                          {Array.from({ length: dateHeaders.length }).map((_, index) => {
                            const isAssigned = component.assignments[index];
                            const isPendingAdd = pendingChanges[component.component_id]?.added.has(index);
                            const isPendingRemove = pendingChanges[component.component_id]?.removed.has(index);
                            
                            return (
                              <td 
                                key={index} 
                                className={`text-center py-4 px-2 cursor-pointer border border-gray-200 ${
                                  isPendingAdd ? 'bg-blue-100' :
                                  isPendingRemove ? 'bg-red-100' :
                                  isAssigned ? 'bg-green-100' : 
                                  'bg-white'
                                }`}
                                onClick={() => toggleCell(component.component_id, index, isAssigned)}
                              >{''}</td>
                            );
                          })}
                          <td className="text-center py-4 px-4">
                            {Math.round((component.assigned_weeks / component.estimated_weeks) * 100)}%
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => deleteComponent(component.component_id)}
                              className="p-1 text-gray-500 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {isExpanded && (
                    newComponent?.projectId === project.project_id.toString() && (
                      <tr className="border-b bg-gray-50">
                        <td colSpan={dateHeaders.length + 4} className="py-2 px-4">
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              placeholder="Component Name"
                              className="px-2 py-1 border rounded"
                              value={newComponent.name}
                              onChange={(e) => setNewComponent(prev => ({
                                projectId: project.project_id.toString(),
                                name: e.target.value,
                                skillId: prev?.skillId || '',
                                estimatedWeeks: prev?.estimatedWeeks || ''
                              }))}
                            />
                            <select
                              className="px-2 py-1 border rounded"
                              value={newComponent.skillId}
                              onChange={(e) => setNewComponent(prev => ({
                                projectId: project.project_id.toString(),
                                skillId: e.target.value,
                                name: prev?.name || '',
                                estimatedWeeks: prev?.estimatedWeeks || ''
                              }))}
                            >
                              <option value="">Select Skill</option>
                              {Object.entries(skills).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Estimated Weeks"
                              className="px-2 py-1 border rounded w-32"
                              value={newComponent.estimatedWeeks}
                              onChange={(e) => setNewComponent(prev => ({
                                projectId: project.project_id.toString(),
                                estimatedWeeks: e.target.value,
                                name: prev?.name || '',
                                skillId: prev?.skillId || ''
                              }))}
                            />
                            <button
                              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                              onClick={() => addComponent(project.project_id.toString())}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                              onClick={() => setNewComponent(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
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