import { useState, useEffect } from 'react';
import { useAuth } from '@/libs/auth';

export const useAllowedIntegrations = () => {
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    const loadAllowedIntegrations = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://134.33.240.184:8000'}/auth/organization/allowed-integrations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          let allowedIntegrations = data.allowed_integrations || [];
          
          // If we get all 3 integrations back and user is admin, try to fix the organization restrictions
          if (allowedIntegrations.length === 3 && user?.role === 'admin' && 
              JSON.stringify(allowedIntegrations.sort()) === JSON.stringify(['confluence', 'jira', 'zendesk'].sort())) {
            try {
              const fixResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://134.33.240.184:8000'}/auth/organization/fix-integrations`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (fixResponse.ok) {
                const fixData = await fixResponse.json();
                if (fixData.allowed_integrations) {
                  allowedIntegrations = fixData.allowed_integrations;
                }
              }
            } catch (error) {
              console.log('Could not auto-fix organization integrations:', error);
            }
          }
          
          // Convert to proper case for display
          const integrationsList = allowedIntegrations.map((integration: string) => {
            switch(integration.toLowerCase()) {
              case 'jira': return 'Jira';
              case 'confluence': return 'Confluence';
              case 'zendesk': return 'Zendesk';
              default: return integration;
            }
          });
          
          setIntegrations(integrationsList);
        } else {
          // Fallback to default integrations
          setIntegrations(['Jira', 'Confluence', 'Zendesk']);
        }
      } catch (error) {
        console.error('Failed to load allowed integrations:', error);
        // Fallback to default integrations
        setIntegrations(['Jira', 'Confluence', 'Zendesk']);
      } finally {
        setLoading(false);
      }
    };

    loadAllowedIntegrations();
  }, [token, user?.role]);

  return { integrations, loading };
};
