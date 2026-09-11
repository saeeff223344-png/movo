export type MockUser = {
  fullName: string;
  email: string;
};

// Placeholder profile — replaced by the authenticated user once auth is wired up.
export const mockUser: MockUser = {
  fullName: "اسم المستخدم",
  email: "user@example.com",
};
