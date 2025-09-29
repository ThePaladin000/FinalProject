import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

export interface PromptTemplateData {
  name: string;
  description: string;
  template: string;
  icon?: string;
  placeholders?: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'dropdown';
    defaultValue?: string;
    options?: string[];
    optional?: boolean;
    description?: string;
  }>;
}

// Function to sync prompt templates from JSON to database
export const syncPromptTemplates = async (templates: PromptTemplateData[]) => {
  // This would be called from a server-side function or admin panel
  // For now, we'll create the structure for it
  return templates.map(template => ({
    name: template.name,
    description: template.description,
    isSystemDefined: true,
    isActive: true,
    icon: template.icon || "📝",
    templateContent: template.template,
    placeholders: template.placeholders || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
};

// Hook to get all prompt templates
export const usePromptTemplates = () => {
  return useQuery(api.queries.getPromptTemplates, {});
};

// Hook to get active prompt templates only
export const useActivePromptTemplates = () => {
  return useQuery(api.queries.getActivePromptTemplates, {});
};

// Hook to create a new prompt template
export const useCreatePromptTemplate = () => {
  return useMutation(api.mutations.createPromptTemplate);
};

// Hook to update a prompt template
export const useUpdatePromptTemplate = () => {
  return useMutation(api.mutations.updatePromptTemplate);
};

// Hook to delete a prompt template
export const useDeletePromptTemplate = () => {
  return useMutation(api.mutations.deletePromptTemplate);
};

// Hook to increment usage count
export const useIncrementPromptTemplateUsage = () => {
  return useMutation(api.mutations.incrementPromptTemplateUsage);
};

// Define the template interface
interface PromptTemplate {
  templateContent: string;
  placeholders?: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'dropdown';
    defaultValue?: string;
    options?: string[];
    optional?: boolean;
    description?: string;
  }>;
}

// Function to process a prompt template with user inputs
export const processPromptTemplate = (
  template: PromptTemplate,
  userInputs: Record<string, string>
): string => {
  let processedContent = template.templateContent;
  
  // Replace placeholders with user inputs
  if (template.placeholders) {
    template.placeholders.forEach((placeholder) => {
      const placeholderName = placeholder.name;
      const userValue = userInputs[placeholderName] || placeholder.defaultValue || '';
      processedContent = processedContent.replace(
        new RegExp(`\\[${placeholderName}\\]`, 'g'),
        userValue
      );
    });
  }
  
  return processedContent;
};

// Function to validate user inputs against template placeholders
export const validateTemplateInputs = (
  template: PromptTemplate,
  userInputs: Record<string, string>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!template.placeholders) {
    return { isValid: true, errors: [] };
  }
  
  template.placeholders.forEach((placeholder) => {
    const value = userInputs[placeholder.name];
    
    // Check required fields
    if (!placeholder.optional && (!value || value.trim() === '')) {
      errors.push(`${placeholder.label} is required`);
    }
    
    // Check dropdown options if specified
    if (placeholder.type === 'dropdown' && placeholder.options && value) {
      if (!placeholder.options.includes(value)) {
        errors.push(`${placeholder.label} must be one of: ${placeholder.options.join(', ')}`);
      }
    }
    
    // Check number type
    if (placeholder.type === 'number' && value) {
      if (isNaN(Number(value))) {
        errors.push(`${placeholder.label} must be a valid number`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 