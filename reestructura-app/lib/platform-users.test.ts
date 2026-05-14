import { describe, expect, it } from "vitest";

import { listPlatformUsers, updatePlatformUserRole } from "./platform-users";
import type { UserRole } from "./types";

function authUser(id: string, email: string, createdAt = "2026-05-01T00:00:00.000Z") {
  return {
    id,
    email,
    created_at: createdAt,
    user_metadata: { full_name: "Nombre Auth" },
  };
}

function createAdminStub({
  authUsers,
  profiles = [],
  invitations = [],
}: {
  authUsers: ReturnType<typeof authUser>[];
  profiles?: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
  }[];
  invitations?: { email: string; role: UserRole; full_name: string | null }[];
}) {
  const profileRows = new Map(profiles.map((row) => [row.id, { ...row }]));

  return {
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: authUsers }, error: null }),
        getUserById: async (id: string) => ({
          data: { user: authUsers.find((user) => user.id === id) ?? null },
          error: null,
        }),
      },
    },
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            in: async (_column: string, ids: string[]) => ({
              data: ids
                .map((id) => profileRows.get(id))
                .filter((row): row is NonNullable<typeof row> => Boolean(row)),
              error: null,
            }),
          }),
          upsert: (rows: { id: string; email: string; full_name: string; role: UserRole } | { id: string; email: string; full_name: string; role: UserRole }[]) => ({
            select: () => ({
              single: async () => {
                const row = Array.isArray(rows) ? rows[0] : rows;
                const existing = profileRows.get(row.id);
                const next = {
                  ...row,
                  created_at: existing?.created_at ?? "2026-05-01T00:00:00.000Z",
                  updated_at: "2026-05-02T00:00:00.000Z",
                };
                profileRows.set(row.id, next);
                return { data: next, error: null };
              },
            }),
          }),
        };
      }

      if (table === "invited_users") {
        return {
          select: () => ({
            in: async () => ({ data: invitations, error: null }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("listPlatformUsers", () => {
  it("includes auth users without a profile row and backfills profiles", async () => {
    const admin = createAdminStub({
      authUsers: [
        authUser("11111111-1111-1111-1111-111111111111", "admin@example.com"),
        authUser("22222222-2222-2222-2222-222222222222", "agente@example.com"),
      ],
      profiles: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          email: "admin@example.com",
          full_name: "Admin",
          role: "admin",
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      invitations: [
        {
          email: "agente@example.com",
          role: "agente",
          full_name: "Agente Invitado",
        },
      ],
    });

    const users = await listPlatformUsers(admin as never);

    expect(users).toHaveLength(2);
    expect(users.map((user) => user.email)).toEqual(
      expect.arrayContaining(["admin@example.com", "agente@example.com"])
    );
    expect(users.find((user) => user.email === "agente@example.com")?.role).toBe("agente");
  });
});

describe("updatePlatformUserRole", () => {
  it("upserts the profile when the auth user exists", async () => {
    const admin = createAdminStub({
      authUsers: [authUser("22222222-2222-2222-2222-222222222222", "agente@example.com")],
    });

    const updated = await updatePlatformUserRole(
      admin as never,
      "22222222-2222-2222-2222-222222222222",
      "gestor"
    );

    expect(updated.role).toBe("gestor");
    expect(updated.email).toBe("agente@example.com");
  });
});
