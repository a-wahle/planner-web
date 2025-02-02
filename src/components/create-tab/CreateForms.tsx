import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CreateFormsProps {
  formType: string;
  setFormType: (type: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  successMessage: string;
  error: string | null;
  children: React.ReactNode;
}

const CreateForms = ({ 
  formType, 
  setFormType, 
  handleSubmit, 
  successMessage, 
  error,
  children 
}: CreateFormsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New {formType.charAt(0).toUpperCase() + formType.slice(1)}</CardTitle>
      </CardHeader>
      <CardContent>
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <RadioGroup
              value={formType}
              onValueChange={setFormType}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="period" id="period" />
                <Label htmlFor="period">Period</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="project" />
                <Label htmlFor="project">Project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contributor" id="contributor" />
                <Label htmlFor="contributor">Contributor</Label>
              </div>
            </RadioGroup>
          </div>

          {children}

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create {formType.charAt(0).toUpperCase() + formType.slice(1)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateForms;
