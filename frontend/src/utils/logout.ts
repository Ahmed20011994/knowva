// Emergency logout utility that can be called from anywhere
// This is useful when the auth context is not available or when logout fails

export const emergencyLogout = () => {
  try {
    // Clear all cookies
    const clearCookie = (name: string) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    };
    
    clearCookie('auth_token');
    
    // Clear all storage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Force redirect
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  } catch (error) {
    console.error('Emergency logout failed:', error);
    // Last resort - reload the page
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};

// Add global error handler for authentication failures
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('401') || 
        event.reason?.message?.includes('Unauthorized') ||
        event.reason?.message?.includes('Invalid token')) {
      console.warn('Authentication error detected, performing emergency logout');
      emergencyLogout();
    }
  });
}
