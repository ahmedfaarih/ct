"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile, Role } from "@/lib/types";
import { CONTRACT_TYPES } from "@/lib/constants";

const ROLES: Role[] = ["requestor", "reviewer", "admin"];
const ROLE_LABEL: Record<Role, string> = {
  requestor: "Requestor",
  reviewer: "Reviewer",
  admin: "Admin",
};

interface RowState {
  roleLoading: boolean;
  roleError: string | null;
  roleSuccess: boolean;
  typesOpen: boolean;
  typesLoading: boolean;
  typesError: string | null;
  passwordOpen: boolean;
  password: string;
  pwLoading: boolean;
  pwError: string | null;
  pwSuccess: boolean;
}

function defaultRowState(): RowState {
  return {
    roleLoading: false,
    roleError: null,
    roleSuccess: false,
    typesOpen: false,
    typesLoading: false,
    typesError: null,
    passwordOpen: false,
    password: "",
    pwLoading: false,
    pwError: null,
    pwSuccess: false,
  };
}

export default function AdminPanel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  // Map of userId → assigned contract type IDs
  const [assignedTypes, setAssignedTypes] = useState<Record<string, string[]>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [usersRes, typesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/reviewer-types"),
      ]);
      const usersJson = await usersRes.json();
      const typesJson = await typesRes.json();

      if (!usersRes.ok) throw new Error(usersJson.error ?? "Failed to load users");

      setUsers(usersJson.users);

      // Build map from assignments array
      const map: Record<string, string[]> = {};
      if (typesJson.assignments) {
        for (const row of typesJson.assignments as { reviewer_id: string; contract_type: string }[]) {
          if (!map[row.reviewer_id]) map[row.reviewer_id] = [];
          map[row.reviewer_id].push(row.contract_type);
        }
      }
      setAssignedTypes(map);

      const states: Record<string, RowState> = {};
      usersJson.users.forEach((u: Profile) => { states[u.id] = defaultRowState(); });
      setRowState(states);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function patchRow(userId: string, patch: Partial<RowState>) {
    setRowState((prev) => ({ ...prev, [userId]: { ...prev[userId], ...patch } }));
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    patchRow(userId, { roleLoading: true, roleError: null, roleSuccess: false });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update role");
      patchRow(userId, { roleSuccess: true });
      setTimeout(() => patchRow(userId, { roleSuccess: false }), 2000);
    } catch (err) {
      patchRow(userId, { roleError: err instanceof Error ? err.message : "Error" });
    } finally {
      patchRow(userId, { roleLoading: false });
    }
  }

  async function handleTypeToggle(userId: string, contractTypeId: string) {
    const current = assignedTypes[userId] ?? [];
    const updated = current.includes(contractTypeId)
      ? current.filter((t) => t !== contractTypeId)
      : [...current, contractTypeId];

    setAssignedTypes((prev) => ({ ...prev, [userId]: updated }));
    patchRow(userId, { typesLoading: true, typesError: null });

    try {
      const res = await fetch("/api/admin/reviewer-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, contractTypes: updated }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
    } catch (err) {
      // revert
      setAssignedTypes((prev) => ({ ...prev, [userId]: current }));
      patchRow(userId, { typesError: err instanceof Error ? err.message : "Error" });
    } finally {
      patchRow(userId, { typesLoading: false });
    }
  }

  async function handlePasswordReset(userId: string) {
    const state = rowState[userId];
    if (!state?.password || state.password.length < 6) {
      patchRow(userId, { pwError: "Password must be at least 6 characters" });
      return;
    }
    patchRow(userId, { pwLoading: true, pwError: null, pwSuccess: false });
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: state.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");
      patchRow(userId, { pwSuccess: true, password: "", passwordOpen: false });
      setTimeout(() => patchRow(userId, { pwSuccess: false }), 2000);
    } catch (err) {
      patchRow(userId, { pwError: err instanceof Error ? err.message : "Error" });
    } finally {
      patchRow(userId, { pwLoading: false });
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-neutral-400">Loading users...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">{fetchError}</p>
        <button onClick={fetchAll} className="mt-4 text-sm text-neutral-900 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* User table */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">User Management</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {users.length} {users.length === 1 ? "user" : "users"} registered
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-widest">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-widest">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-widest">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-widest">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => {
                const rs = rowState[user.id] ?? defaultRowState();
                return (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-3 text-neutral-900 font-medium">
                      {user.full_name || <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{user.email}</td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          disabled={rs.roleLoading}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 disabled:opacity-50 transition"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                        {rs.roleLoading && <span className="text-xs text-neutral-400">Saving...</span>}
                        {rs.roleSuccess && <span className="text-xs text-neutral-500">Saved</span>}
                        {rs.roleError && <span className="text-xs text-red-600">{rs.roleError}</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>

                    {/* Password reset */}
                    <td className="px-4 py-3">
                      {!rs.passwordOpen ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => patchRow(user.id, { passwordOpen: true, pwError: null, pwSuccess: false })}
                            className="text-xs px-2.5 py-1.5 border border-neutral-200 rounded text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                          >
                            Reset Password
                          </button>
                          {rs.pwSuccess && <span className="text-xs text-neutral-500">Updated</span>}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="password"
                              value={rs.password}
                              onChange={(e) => patchRow(user.id, { password: e.target.value, pwError: null })}
                              placeholder="New password"
                              minLength={6}
                              className="text-sm border border-neutral-200 rounded px-2.5 py-1.5 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition w-36"
                            />
                            <button
                              onClick={() => handlePasswordReset(user.id)}
                              disabled={rs.pwLoading}
                              className="text-xs px-2.5 py-1.5 bg-neutral-900 text-white rounded hover:bg-neutral-700 disabled:opacity-40 transition"
                            >
                              {rs.pwLoading ? "Saving..." : "Set"}
                            </button>
                            <button
                              onClick={() => patchRow(user.id, { passwordOpen: false, password: "", pwError: null })}
                              className="text-xs px-2.5 py-1.5 border border-neutral-200 rounded text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition"
                            >
                              Cancel
                            </button>
                          </div>
                          {rs.pwError && <p className="text-xs text-red-600">{rs.pwError}</p>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Type Assignments — only for reviewer/admin users */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">Case Type Assignments</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Assign contract types to reviewers and admins. Incoming contracts will auto-assign to the matched reviewer.
          </p>
        </div>

        <div className="space-y-3">
          {users.filter((u) => u.role === "reviewer" || u.role === "admin").length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center">
              <p className="text-sm text-neutral-400">No reviewers or admins yet. Promote a user to Reviewer or Admin first.</p>
            </div>
          )}

          {users
            .filter((u) => u.role === "reviewer" || u.role === "admin")
            .map((user) => {
              const rs = rowState[user.id] ?? defaultRowState();
              const userTypes = assignedTypes[user.id] ?? [];

              return (
                <div key={user.id} className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                  {/* Header */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => patchRow(user.id, { typesOpen: !rs.typesOpen })}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900 text-sm">
                        {user.full_name || user.email}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 border border-neutral-200 px-1.5 py-0.5 rounded">
                        {ROLE_LABEL[user.role]}
                      </span>
                      {userTypes.length > 0 ? (
                        <span className="text-xs text-neutral-500">
                          {userTypes.length} type{userTypes.length !== 1 ? "s" : ""} assigned
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">No types assigned</span>
                      )}
                    </div>
                    <span className="text-xs px-2.5 py-1 border border-neutral-200 rounded text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 transition">
                      {rs.typesOpen ? "Hide" : "Edit"}
                    </span>
                  </button>

                  {/* Assigned type pills (collapsed view) */}
                  {!rs.typesOpen && userTypes.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                      {userTypes.map((typeId) => {
                        const label = CONTRACT_TYPES.find((t) => t.id === typeId)?.label ?? typeId;
                        return (
                          <span
                            key={typeId}
                            className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded border border-neutral-200"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded checkboxes */}
                  {rs.typesOpen && (
                    <div className="px-5 pb-5 border-t border-neutral-100">
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {CONTRACT_TYPES.map((ct) => {
                          const checked = userTypes.includes(ct.id);
                          return (
                            <label
                              key={ct.id}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded border cursor-pointer transition select-none ${
                                checked
                                  ? "border-neutral-400 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={rs.typesLoading}
                                onChange={() => handleTypeToggle(user.id, ct.id)}
                                className="accent-neutral-900 shrink-0 disabled:opacity-50"
                              />
                              <span className={`text-sm ${checked ? "font-medium text-neutral-900" : "text-neutral-700"}`}>
                                {ct.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {rs.typesLoading && (
                        <p className="text-xs text-neutral-400 mt-3">Saving...</p>
                      )}
                      {rs.typesError && (
                        <p className="text-xs text-red-600 mt-3">{rs.typesError}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
