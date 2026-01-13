// Role-based access control utilities for BuildOS

export const UserRoles = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  ProjectManager: 'ProjectManager',
  Superintendent: 'Superintendent',
  FieldStaff: 'FieldStaff',
  Architect: 'Architect',
  Engineer: 'Engineer',
  Owner: 'Owner',
  Subcontractor: 'Subcontractor',
  Lender: 'Lender',
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

// Role hierarchy levels (higher = more access)
export const roleHierarchy: Record<string, number> = {
  [UserRoles.SuperAdmin]: 100,
  [UserRoles.Admin]: 90,
  [UserRoles.Owner]: 80,
  [UserRoles.ProjectManager]: 70,
  [UserRoles.Architect]: 60,
  [UserRoles.Engineer]: 60,
  [UserRoles.Superintendent]: 50,
  [UserRoles.FieldStaff]: 30,
  [UserRoles.Subcontractor]: 20,
  [UserRoles.Lender]: 40,
};

// Master admin roles (full system access)
export const MASTER_ADMIN_ROLES = [UserRoles.SuperAdmin, UserRoles.Admin];

// Management roles (can manage projects and users)
export const MANAGEMENT_ROLES = [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.Owner, UserRoles.ProjectManager];

// Contractor roles
export const CONTRACTOR_ROLES = [UserRoles.Subcontractor];

// Field roles
export const FIELD_ROLES = [UserRoles.Superintendent, UserRoles.FieldStaff, UserRoles.Subcontractor];

// Check if user has master admin access
export function isMasterAdmin(role?: string | null): boolean {
  return !!role && MASTER_ADMIN_ROLES.includes(role as UserRole);
}

// Check if user has management access
export function isManagement(role?: string | null): boolean {
  return !!role && MANAGEMENT_ROLES.includes(role as UserRole);
}

// Check if user is a contractor
export function isContractor(role?: string | null): boolean {
  return role === UserRoles.Subcontractor;
}

// Check if user is a lender
export function isLender(role?: string | null): boolean {
  return role === UserRoles.Lender;
}

// Check if user has at least a certain role level
export function hasMinimumRole(userRole?: string | null, minimumRole?: string): boolean {
  if (!userRole) return false;
  const userLevel = roleHierarchy[userRole] || 0;
  const minLevel = minimumRole ? roleHierarchy[minimumRole] || 0 : 0;
  return userLevel >= minLevel;
}

// Get role display name
export function getRoleDisplayName(role?: string | null): string {
  if (!role) return 'User';
  const names: Record<string, string> = {
    SuperAdmin: 'Super Administrator',
    Admin: 'Administrator',
    ProjectManager: 'Project Manager',
    Superintendent: 'Superintendent',
    FieldStaff: 'Field Staff',
    Architect: 'Architect',
    Engineer: 'Engineer',
    Owner: 'Owner',
    Subcontractor: 'Contractor',
    Lender: 'Lender',
  };
  return names[role] || role;
}

// Get role badge color
export function getRoleBadgeColor(role?: string | null): string {
  if (!role) return 'bg-gray-100 text-gray-800';
  const colors: Record<string, string> = {
    SuperAdmin: 'bg-purple-100 text-purple-800',
    Admin: 'bg-red-100 text-red-800',
    ProjectManager: 'bg-blue-100 text-blue-800',
    Superintendent: 'bg-orange-100 text-orange-800',
    FieldStaff: 'bg-green-100 text-green-800',
    Architect: 'bg-indigo-100 text-indigo-800',
    Engineer: 'bg-cyan-100 text-cyan-800',
    Owner: 'bg-yellow-100 text-yellow-800',
    Subcontractor: 'bg-teal-100 text-teal-800',
    Lender: 'bg-pink-100 text-pink-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}
