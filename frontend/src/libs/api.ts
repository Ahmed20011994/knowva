// API service for authentication and other backend calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://135.222.251.229:8000'	

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirm_password: string;
  organization: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    organization: string;
    role: string;
    admin_role?: string;
    is_active: boolean;
    onboarding_completed: boolean;
    created_at: string;
  };
  expires_in: number;
}

export interface ApiError {
  detail: string;
}

export interface Team {
  id: string;
  name: string;
  integrations: string[];
  created_at: string;
  members_count: number;
}

export interface TeamCreateRequest {
  name: string;
  integrations: string[];
}

export interface User {
  id: string;
  email: string;
  role: string;
  teams: string[];
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const error: ApiError = await response.json();
        errorMessage = error.detail || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      // Handle authentication errors
      if (response.status === 401) {
        // Import emergency logout dynamically to avoid circular dependencies
        import('../utils/logout').then(({ emergencyLogout }) => {
          console.warn('401 error detected, performing emergency logout');
          emergencyLogout();
        });
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signupFromInvite(inviteData: {
    token: string;
    password: string;
    confirm_password: string;
  }): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/auth/users/signup-from-invite', {
      method: 'POST',
      body: JSON.stringify(inviteData),
    });
  }

  async getCurrentUser(token: string): Promise<{
    id: string;
    email: string;
    organization: string;
    role: string;
    admin_role?: string;
    is_active: boolean;
    onboarding_completed: boolean;
    created_at: string;
  }> {
    return this.makeRequest('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Team management methods
  async getTeams(token: string): Promise<Team[]> {
    return this.makeRequest<Team[]>('/auth/teams', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createTeam(teamData: TeamCreateRequest, token: string): Promise<Team> {
    return this.makeRequest<Team>('/auth/teams', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(teamData),
    });
  }

  async updateTeam(teamId: string, teamData: TeamCreateRequest, token: string): Promise<Team> {
    return this.makeRequest<Team>(`/auth/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(teamData),
    });
  }

  async deleteTeam(teamId: string, token: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/auth/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // User management methods
  async getUsers(token: string): Promise<User[]> {
    const response = await this.makeRequest<{ users: User[] }>('/auth/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.users;
  }
}

export const apiService = new ApiService();
