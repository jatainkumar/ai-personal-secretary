import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Person, UploadStatus } from '../types';

export function useContacts(userId: string | null, setUploadStatus: (status: UploadStatus | null) => void) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit State
  // Create/Edit State
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Person>>({});

  const fetchPersons = async () => {
    if (!userId) return;
    try {
      console.log('🔄 Fetching contacts for user:', userId);
      const res = await api.get(`/persons`, { params: { user_id: userId } });
      const contacts = res.data.persons || [];
      console.log(`✅ Fetched ${contacts.length} contacts`);
      setPersons(contacts);
    } catch (err) {
      console.error("Failed to fetch persons", err);
    }
  };

  const handlePersonFileUpload = async (personId: string, files: FileList | null) => {
    if (!files || files.length === 0 || !userId) return;

    setUploadStatus({ type: "info", message: "📤 Uploading files to contact..." });

    const formData = new FormData();
    formData.append("user_id", userId);
    Array.from(files).forEach(file => {
      formData.append("files", file);
    });

    try {
      setUploadStatus({ type: "info", message: "⚙️ Processing contact files..." });

      await api.post(`/persons/${personId}/upload`, formData);

      setUploadStatus({ type: "success", message: "✅ Contact files uploaded successfully!" });
      fetchPersons();

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ type: "error", message: "❌ Failed to upload contact files" });
      console.error(err);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handlePersonFileDelete = async (personId: string, filename: string) => {
    if (!userId) return;

    const confirmMessage = `Are you sure you want to delete "${filename}"?\n\nThis will remove the file from:\n• Contact's attached files\n• Knowledge base\n• Vector store\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUploadStatus({ type: "info", message: "🗑️ Deleting file..." });

      await api.delete(`/persons/${personId}/files/${encodeURIComponent(filename)}?user_id=${userId}`);

      setUploadStatus({ type: "success", message: `✅ File "${filename}" deleted successfully!` });
      fetchPersons();

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ type: "error", message: "❌ Failed to delete file" });
      console.error("Error deleting file:", err);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleDeletePerson = async (person: Person) => {
    if (!userId) return;
    const confirmMessage = `Are you sure you want to delete ${person.first_name} ${person.last_name}?\n\nThis will remove:\n• Contact information\n• All uploaded files\n• All data from the knowledge base\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUploadStatus({ type: "info", message: "🗑️ Deleting contact..." });

      const response = await api.delete(`/persons/${person.id}?user_id=${userId}`);

      setUploadStatus({ type: "success", message: `✅ ${response.data.message}` });
      fetchPersons();

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ type: "error", message: "❌ Failed to delete contact" });
      console.error("Error deleting person:", err);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  // Edit/Create Handlers
  const handleEditPerson = (person: Person) => {
    setIsCreating(false);
    setEditingPerson(person);
    setEditFormData({
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      email: person.email || '',
      phone: person.phone || '',
      company: person.company || '',
      position: person.position || '',
      url: person.url || '',
      address: person.address || '',
      birthday: person.birthday || '',
      notes: person.notes || ''
    });
  };

  const handleCreatePerson = () => {
    setIsCreating(true);
    setEditingPerson(null);
    setEditFormData({});
  };

  const handleCancelEdit = () => {
    setEditingPerson(null);
    setIsCreating(false);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!userId) return;
    if (!isCreating && !editingPerson) return;

    try {
      const action = isCreating ? "Creating" : "Updating";
      setUploadStatus({ type: "info", message: `✏️ ${action} contact...` });

      if (isCreating) {
        // Create new person
        await api.post(`/persons/?user_id=${userId}`, editFormData);
      } else if (editingPerson) {
        // Update existing person
        await api.put(`/persons/${editingPerson.id}?user_id=${userId}`, editFormData);
      }

      setUploadStatus({ type: "success", message: `✅ Contact ${isCreating ? 'created' : 'updated'} successfully!` });
      fetchPersons();
      setEditingPerson(null);
      setIsCreating(false);
      setEditFormData({});

      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      setUploadStatus({ type: "error", message: `❌ Failed to ${isCreating ? 'create' : 'update'} contact` });
      console.error("Error saving person:", err);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPersons();
    }
  }, [userId]);

  return {
    persons,
    searchQuery,
    setSearchQuery,
    editingPerson,
    isCreating,
    editFormData,
    setEditFormData,
    fetchPersons,
    handlePersonFileUpload,
    handlePersonFileDelete,
    handleDeletePerson,
    handleEditPerson,
    handleCreatePerson,
    handleCancelEdit,
    handleSaveEdit
  };
}
