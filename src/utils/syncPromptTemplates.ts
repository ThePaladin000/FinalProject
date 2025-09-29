import promptTemplatesData from './prompt_templates.json';

export interface PromptTemplateFromJSON {
  Title: string;
  description: string;
  template: string;
}

export interface PromptTemplateForDB {
  name: string;
  description: string;
  templateContent: string;
  isSystemDefined: boolean;
  isActive: boolean;
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

// Function to extract placeholders from template content
function extractPlaceholders(templateContent: string): Array<{
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown';
  defaultValue?: string;
  options?: string[];
  optional?: boolean;
  description?: string;
}> {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const placeholders: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'dropdown';
    defaultValue?: string;
    options?: string[];
    optional?: boolean;
    description?: string;
  }> = [];
  
  let match;
  while ((match = placeholderRegex.exec(templateContent)) !== null) {
    const placeholderName = match[1];
    
    // Skip if we already have this placeholder
    if (placeholders.find(p => p.name === placeholderName)) {
      continue;
    }
    
    // Generate a user-friendly label from the placeholder name
    const label = placeholderName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\b(Here|Specific|Topic|Technology|Concept|Methodology|Industry)\b/g, '')
      .trim();
    
    placeholders.push({
      name: placeholderName,
      label: label || 'Input',
      type: 'textarea', // Default to textarea for most placeholders
      optional: false,
      description: `Enter the ${label.toLowerCase()}`,
    });
  }
  
  return placeholders;
}

// Function to get appropriate icon based on template name
function getIconForTemplate(name: string): string {
  const iconMap: Record<string, string> = {
    'Knowledge Graph': '🕸️',
    'History': '📚',
    'Social Analysis': '🌍',
    'Practical Implementation': '⚙️',
    'Legal': '⚖️',
    'Research': '🔬',
    'Analysis': '📊',
    'Summary': '📝',
    'Creative': '💡',
    'Technical': '🔧',
    'Business': '💼',
    'Academic': '🎓',
  };
  
  // Try to find a matching icon
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  
  // Default icon
  return '📝';
}

// Function to convert JSON templates to database format
export function convertTemplatesToDBFormat(
  templates: PromptTemplateFromJSON[]
): PromptTemplateForDB[] {
  return templates.map(template => {
    const placeholders = extractPlaceholders(template.template);
    const icon = getIconForTemplate(template.Title);
    
    return {
      name: template.Title,
      description: template.description,
      templateContent: template.template,
      isSystemDefined: true,
      isActive: true,
      icon,
      placeholders,
    };
  });
}

// Function to get all templates from JSON
export function getTemplatesFromJSON(): PromptTemplateForDB[] {
  return convertTemplatesToDBFormat(promptTemplatesData as PromptTemplateFromJSON[]);
}

// Function to find new templates (templates in JSON but not in DB)
export function findNewTemplates(
  jsonTemplates: PromptTemplateForDB[],
  dbTemplates: Array<{ name: string }>
): PromptTemplateForDB[] {
  const dbTemplateNames = new Set(dbTemplates.map(t => t.name));
  return jsonTemplates.filter(template => !dbTemplateNames.has(template.name));
}

// Function to find updated templates (templates that exist in both but have different content)
export function findUpdatedTemplates(
  jsonTemplates: PromptTemplateForDB[],
  dbTemplates: Array<{ name: string; templateContent: string; description: string }>
): Array<{ jsonTemplate: PromptTemplateForDB; dbTemplate: { name: string; templateContent: string; description: string } }> {
  const updates: Array<{ jsonTemplate: PromptTemplateForDB; dbTemplate: { name: string; templateContent: string; description: string } }> = [];
  
  for (const jsonTemplate of jsonTemplates) {
    const dbTemplate = dbTemplates.find(t => t.name === jsonTemplate.name);
    if (dbTemplate && (
      dbTemplate.templateContent !== jsonTemplate.templateContent ||
      dbTemplate.description !== jsonTemplate.description
    )) {
      updates.push({ jsonTemplate, dbTemplate });
    }
  }
  
  return updates;
}

// Export the current templates for easy access
export const currentTemplates = getTemplatesFromJSON(); 