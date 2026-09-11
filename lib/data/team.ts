export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  instagram: string;
  github: string;
  website: string;
};

// Clear placeholders only — replace with real team info before launch.
export const mockTeam: TeamMember[] = [
  {
    id: "member-1",
    name: "اسم المطور",
    role: "مؤسس ومطور MOVO",
    bio: "",
    email: "team@movo.app",
    instagram: "#",
    github: "#",
    website: "#",
  },
];
