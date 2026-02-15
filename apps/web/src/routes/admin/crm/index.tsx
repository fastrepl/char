import { createFileRoute } from "@tanstack/react-router";
import {
  BuildingIcon,
  MailIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import React, { useCallback, useState } from "react";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/admin/crm/")({
  component: CRMPage,
});

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: "lead" | "prospect" | "customer" | "churned";
  notes: string;
  createdAt: string;
}

const STATUS_COLORS: Record<Contact["status"], string> = {
  lead: "bg-blue-50 text-blue-700",
  prospect: "bg-yellow-50 text-yellow-700",
  customer: "bg-green-50 text-green-700",
  churned: "bg-neutral-100 text-neutral-500",
};

function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Contact["status"] | "all">(
    "all",
  );

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery
      || c.name.toLowerCase().includes(searchQuery.toLowerCase())
      || c.email.toLowerCase().includes(searchQuery.toLowerCase())
      || c.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddContact = useCallback(
    (contact: Omit<Contact, "id" | "createdAt">) => {
      const newContact: Contact = {
        ...contact,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setContacts((prev) => [newContact, ...prev]);
      setIsAddingContact(false);
    },
    [],
  );

  const handleUpdateContact = useCallback(
    (id: string, updates: Partial<Contact>) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      setSelectedContact((prev) =>
        prev?.id === id ? { ...prev, ...updates } : prev
      );
    },
    [],
  );

  const handleDeleteContact = useCallback(
    (id: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
    },
    [selectedContact],
  );

  const statusCounts = contacts.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-9 pr-3 h-8 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 w-64"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(
                ["all", "lead", "prospect", "customer", "churned"] as const
              ).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "h-7 px-2.5 text-xs rounded-md transition-colors capitalize",
                    statusFilter === status
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100",
                  )}
                >
                  {status}
                  {status !== "all" && statusCounts[status]
                    ? ` (${statusCounts[status]})`
                    : status === "all" && contacts.length > 0
                    ? ` (${contacts.length})`
                    : ""}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingContact(true)}
            className="h-8 px-3 text-sm flex items-center gap-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-auto">
          {contacts.length === 0 && !isAddingContact
            ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                <UserIcon className="w-10 h-10 mb-3 text-neutral-300" />
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="text-xs mt-1">
                  Add your first contact to get started
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingContact(true)}
                  className="mt-4 h-8 px-4 text-sm flex items-center gap-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>
            )
            : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-neutral-600">
                      Name
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-neutral-600">
                      Email
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-neutral-600">
                      Company
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-neutral-600">
                      Role
                    </th>
                    <th className="text-center px-4 py-2 font-medium text-neutral-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={cn(
                        "border-b border-neutral-100 cursor-pointer transition-colors",
                        selectedContact?.id === contact.id
                          ? "bg-blue-50"
                          : "hover:bg-neutral-50",
                      )}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center">
                            <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                          <span className="font-medium text-neutral-900">
                            {contact.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {contact.email}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {contact.company}
                      </td>
                      <td className="px-4 py-2 text-neutral-600">
                        {contact.role}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                            STATUS_COLORS[contact.status],
                          )}
                        >
                          {contact.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredContacts.length === 0 && contacts.length > 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-neutral-500"
                      >
                        No contacts match your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
        </div>

        {(selectedContact || isAddingContact) && (
          <div className="w-96 border-l border-neutral-200 bg-white overflow-auto">
            {isAddingContact
              ? (
                <AddContactForm
                  onAdd={handleAddContact}
                  onCancel={() => setIsAddingContact(false)}
                />
              )
              : selectedContact
              ? (
                <ContactDetail
                  contact={selectedContact}
                  onClose={() => setSelectedContact(null)}
                  onUpdate={(updates) =>
                    handleUpdateContact(selectedContact.id, updates)}
                  onDelete={() => handleDeleteContact(selectedContact.id)}
                />
              )
              : null}
          </div>
        )}
      </div>
    </div>
  );
}

function AddContactForm({
  onAdd,
  onCancel,
}: {
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<Contact["status"]>("lead");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, email, company, role, status, notes });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h3 className="font-medium text-sm text-neutral-900">
          Add New Contact
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-3">
        <FormField label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </FormField>
        <FormField label="Company">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc"
            className="w-full h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </FormField>
        <FormField label="Role">
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Engineering Manager"
            className="w-full h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </FormField>
        <FormField label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Contact["status"])}
            className="w-full h-8 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
        </FormField>
        <FormField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
          />
        </FormField>
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full h-9 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          Add Contact
        </button>
      </form>
    </div>
  );
}

function ContactDetail({
  contact,
  onClose,
  onUpdate,
  onDelete,
}: {
  contact: Contact;
  onClose: () => void;
  onUpdate: (updates: Partial<Contact>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(contact.notes);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <h3 className="font-medium text-sm text-neutral-900">
          Contact Details
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-neutral-500" />
          </div>
          <div>
            <div className="font-medium text-neutral-900">{contact.name}</div>
            {contact.role && (
              <div className="text-sm text-neutral-500">{contact.role}</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <MailIcon className="w-4 h-4 text-neutral-400" />
              <a
                href={`mailto:${contact.email}`}
                className="text-blue-600 hover:underline"
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2 text-sm">
              <BuildingIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-700">{contact.company}</span>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-neutral-500 mb-1">
            Status
          </div>
          <select
            value={contact.status}
            onChange={(e) =>
              onUpdate({ status: e.target.value as Contact["status"] })}
            className="h-8 px-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-neutral-500">Notes</div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setEditNotes(contact.notes);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {isEditing
            ? (
              <div className="space-y-2">
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({ notes: editNotes });
                      setIsEditing(false);
                    }}
                    className="h-7 px-3 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="h-7 px-3 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
            : (
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                {contact.notes || "No notes"}
              </p>
            )}
        </div>

        <div className="text-xs text-neutral-400">
          Added: {new Date(contact.createdAt).toLocaleDateString()}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="w-full h-8 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete Contact
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
